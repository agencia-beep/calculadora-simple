// LeadFinder CRM — Cloudflare Worker + D1
// API completa para el pipeline de ventas

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-crm-secret, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

function err(msg, status = 400) {
  return json({ error: msg }, status);
}

function auth(request, env) {
  const secret = (request.headers.get("x-crm-secret") || "").trim();
  return secret === (env.CRM_SECRET || "").trim();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (!auth(request, env)) return err("Unauthorized", 401);

    // ── GET /health ──────────────────────────────────────────────────────────
    if (path === "/health") return json({ status: "ok", service: "leadfinder-crm" });

    // ── GET /pipeline ─────────────────────────────────────────────────────────
    // Retorna leads agrupados por etapa para el Kanban
    if (path === "/pipeline" && request.method === "GET") {
      const stages = ["nuevo", "contactado", "respondio", "propuesta", "negociacion", "cliente", "sin_interes", "reimpactar"];
      const result = {};
      for (const stage of stages) {
        const { results } = await env.DB.prepare(
          `SELECT id, business_name, niche, city, state, email, phone, score, priority,
                  service_interest, deal_value, detected_language, last_contact_at,
                  next_followup_at, created_at, updated_at
           FROM leads WHERE stage = ? ORDER BY score DESC, updated_at DESC LIMIT 100`
        ).bind(stage).all();
        result[stage] = results;
      }
      return json(result);
    }

    // ── GET /leads ────────────────────────────────────────────────────────────
    if (path === "/leads" && request.method === "GET") {
      const stage = url.searchParams.get("stage") || "";
      const niche = url.searchParams.get("niche") || "";
      const city  = url.searchParams.get("city") || "";
      const q     = url.searchParams.get("q") || "";
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 200);
      const offset = parseInt(url.searchParams.get("offset") || "0");

      let where = "WHERE 1=1";
      const params = [];
      if (stage) { where += " AND stage = ?"; params.push(stage); }
      if (niche) { where += " AND niche LIKE ?"; params.push(`%${niche}%`); }
      if (city)  { where += " AND city LIKE ?"; params.push(`%${city}%`); }
      if (q)     { where += " AND (business_name LIKE ? OR email LIKE ? OR phone LIKE ?)"; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }

      const { results } = await env.DB.prepare(
        `SELECT * FROM leads ${where} ORDER BY score DESC, updated_at DESC LIMIT ? OFFSET ?`
      ).bind(...params, limit, offset).all();

      const { results: countRes } = await env.DB.prepare(
        `SELECT COUNT(*) as total FROM leads ${where}`
      ).bind(...params).all();

      return json({ leads: results, total: countRes[0].total, limit, offset });
    }

    // ── GET /leads/:id ────────────────────────────────────────────────────────
    const leadMatch = path.match(/^\/leads\/(\d+)$/);
    if (leadMatch && request.method === "GET") {
      const id = leadMatch[1];
      const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first();
      if (!lead) return err("Lead no encontrado", 404);

      const { results: notes } = await env.DB.prepare(
        "SELECT * FROM notes WHERE lead_id = ? ORDER BY created_at DESC"
      ).bind(id).all();

      const { results: activities } = await env.DB.prepare(
        "SELECT * FROM activities WHERE lead_id = ? ORDER BY created_at DESC LIMIT 50"
      ).bind(id).all();

      return json({ ...lead, notes, activities });
    }

    // ── POST /leads ───────────────────────────────────────────────────────────
    if (path === "/leads" && request.method === "POST") {
      const body = await request.json();
      if (!body.business_name) return err("business_name requerido");

      const { meta } = await env.DB.prepare(`
        INSERT INTO leads (external_id, place_id, business_name, niche, category, address, city, state,
          country, phone, email, website, rating, reviews_count, maps_url, facebook_url, instagram_url,
          linkedin_url, owner_name, website_status, score, priority, diagnosis, marketing_gaps,
          detected_language, stage, service_interest, deal_value)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).bind(
        body.external_id || null, body.place_id || null, body.business_name, body.niche || null,
        body.category || null, body.address || null, body.city || null, body.state || null,
        body.country || "US", body.phone || null, body.email || null, body.website || null,
        body.rating || null, body.reviews_count || 0, body.maps_url || null,
        body.facebook_url || null, body.instagram_url || null, body.linkedin_url || null,
        body.owner_name || null, body.website_status || null, body.score || 0,
        body.priority || "Media", body.diagnosis || null, body.marketing_gaps || null,
        body.detected_language || "es", body.stage || "nuevo",
        body.service_interest || null, body.deal_value || 0
      ).run();

      await logActivity(env.DB, meta.last_row_id, "created", `Lead creado: ${body.business_name}`);
      return json({ id: meta.last_row_id, ok: true }, 201);
    }

    // ── PATCH /leads/:id ──────────────────────────────────────────────────────
    const patchMatch = path.match(/^\/leads\/(\d+)$/);
    if (patchMatch && request.method === "PATCH") {
      const id = patchMatch[1];
      const body = await request.json();
      const lead = await env.DB.prepare("SELECT * FROM leads WHERE id = ?").bind(id).first();
      if (!lead) return err("Lead no encontrado", 404);

      const fields = [];
      const values = [];
      const allowed = ["stage","service_interest","deal_value","deal_notes","next_followup_at",
        "owner_name","priority","sequence_step","sequence_paused","responded_at","closed_at",
        "last_contact_at","contacted_at","email","phone","website","detected_language"];

      for (const key of allowed) {
        if (key in body) { fields.push(`${key} = ?`); values.push(body[key]); }
      }
      if (!fields.length) return err("Nada que actualizar");

      fields.push("updated_at = datetime('now')");
      await env.DB.prepare(`UPDATE leads SET ${fields.join(", ")} WHERE id = ?`)
        .bind(...values, id).run();

      // Registrar cambio de etapa
      if (body.stage && body.stage !== lead.stage) {
        await logActivity(env.DB, id, "stage_changed",
          `Etapa: ${stageLabel(lead.stage)} → ${stageLabel(body.stage)}`);
      }

      return json({ ok: true });
    }

    // ── DELETE /leads/:id ─────────────────────────────────────────────────────
    const deleteMatch = path.match(/^\/leads\/(\d+)$/);
    if (deleteMatch && request.method === "DELETE") {
      const id = deleteMatch[1];
      await env.DB.prepare("DELETE FROM leads WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }

    // ── POST /leads/:id/notes ─────────────────────────────────────────────────
    const noteMatch = path.match(/^\/leads\/(\d+)\/notes$/);
    if (noteMatch && request.method === "POST") {
      const id = noteMatch[1];
      const { content } = await request.json();
      if (!content?.trim()) return err("Contenido requerido");

      await env.DB.prepare("INSERT INTO notes (lead_id, content) VALUES (?, ?)").bind(id, content.trim()).run();
      await logActivity(env.DB, id, "note_added", content.trim().slice(0, 100));
      return json({ ok: true }, 201);
    }

    // ── DELETE /notes/:id ─────────────────────────────────────────────────────
    const delNoteMatch = path.match(/^\/notes\/(\d+)$/);
    if (delNoteMatch && request.method === "DELETE") {
      await env.DB.prepare("DELETE FROM notes WHERE id = ?").bind(delNoteMatch[1]).run();
      return json({ ok: true });
    }

    // ── GET /stats ────────────────────────────────────────────────────────────
    if (path === "/stats" && request.method === "GET") {
      const stages = ["nuevo","contactado","respondio","propuesta","negociacion","cliente","sin_interes","reimpactar"];
      const byStage = {};
      for (const s of stages) {
        const r = await env.DB.prepare("SELECT COUNT(*) as c FROM leads WHERE stage = ?").bind(s).first();
        byStage[s] = r.c;
      }

      const total = await env.DB.prepare("SELECT COUNT(*) as c FROM leads").first();
      const withEmail = await env.DB.prepare("SELECT COUNT(*) as c FROM leads WHERE email IS NOT NULL AND email != ''").first();
      const revenue = await env.DB.prepare("SELECT COALESCE(SUM(deal_value),0) as r FROM leads WHERE stage = 'cliente'").first();

      const byNiche = await env.DB.prepare(
        "SELECT niche, COUNT(*) as total, SUM(CASE WHEN stage='cliente' THEN 1 ELSE 0 END) as clientes FROM leads GROUP BY niche ORDER BY total DESC LIMIT 10"
      ).all();

      const byCity = await env.DB.prepare(
        "SELECT city, COUNT(*) as total, SUM(CASE WHEN stage='cliente' THEN 1 ELSE 0 END) as clientes FROM leads GROUP BY city ORDER BY total DESC LIMIT 10"
      ).all();

      const recent = await env.DB.prepare(
        "SELECT id, business_name, niche, city, stage, updated_at FROM leads ORDER BY updated_at DESC LIMIT 10"
      ).all();

      return json({
        total: total.c,
        with_email: withEmail.c,
        revenue: revenue.r,
        by_stage: byStage,
        by_niche: byNiche.results,
        by_city: byCity.results,
        recent: recent.results,
      });
    }

    // ── POST /migrate ─────────────────────────────────────────────────────────
    // Importa leads desde el backend LeadFinder original
    if (path === "/migrate" && request.method === "POST") {
      const { leads } = await request.json();
      if (!Array.isArray(leads)) return err("Se esperaba { leads: [...] }");

      let inserted = 0;
      let skipped = 0;

      for (const l of leads) {
        const existing = await env.DB.prepare(
          "SELECT id FROM leads WHERE external_id = ?"
        ).bind(l.id).first();

        if (existing) { skipped++; continue; }

        const stage = mapContactStatus(l.contact_status);
        await env.DB.prepare(`
          INSERT INTO leads (external_id, place_id, business_name, niche, category, address, city, state,
            country, phone, email, website, rating, reviews_count, maps_url, facebook_url, instagram_url,
            linkedin_url, owner_name, website_status, score, priority, diagnosis, marketing_gaps,
            detected_language, stage, last_contact_at, created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).bind(
          l.id, l.place_id || null, l.business_name, l.niche || null, l.category || null,
          l.address || null, l.city || null, l.state || null, l.country || "US",
          l.phone || null, l.email || null, l.website || null, l.rating || null,
          l.reviews_count || 0, l.maps_url || null, l.facebook_url || null,
          l.instagram_url || null, l.linkedin_url || null, l.owner_name || null,
          l.website_status || null, l.score || 0, l.priority || "Media",
          l.diagnosis || null, l.marketing_gaps || null, l.detected_language || "es",
          stage, l.updated_at || null, l.created_at || null
        ).run();

        inserted++;
      }

      return json({ ok: true, inserted, skipped, total: leads.length });
    }

    return json({ error: "Ruta no encontrada" }, 404);
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function logActivity(db, leadId, type, description) {
  await db.prepare(
    "INSERT INTO activities (lead_id, type, description) VALUES (?, ?, ?)"
  ).bind(leadId, type, description).run();
}

function stageLabel(stage) {
  const map = {
    nuevo: "Nuevo", contactado: "Contactado", respondio: "Respondió",
    propuesta: "Propuesta", negociacion: "Negociación", cliente: "Cliente",
    sin_interes: "Sin interés", reimpactar: "Reimpactar",
  };
  return map[stage] || stage;
}

function mapContactStatus(status) {
  const map = {
    "No contactado": "nuevo",
    "Contactado": "contactado",
    "Reunion agendada": "propuesta",
    "Cerrado": "cliente",
    "Descartado": "sin_interes",
  };
  return map[status] || "nuevo";
}
