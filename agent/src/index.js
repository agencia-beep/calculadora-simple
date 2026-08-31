import { getNewLeads, markContacted } from "./leadfinder.js";
import { generateEmail } from "./personalizer.js";
import { sendLeadEmail, sendSummaryEmail } from "./emailer.js";

const MAX_LEADS_PER_RUN = 15; // ~45 subrequests (3 por lead: Claude + Resend + PATCH)

export default {
  // ── Disparo automático por Cron ──────────────────────────────────────────
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runAgent(env));
  },

  // ── Disparo manual via HTTP GET /run ────────────────────────────────────
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "x-agent-secret, Content-Type",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
    };

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (url.pathname === "/run" && request.method === "GET") {
      const secret = request.headers.get("x-agent-secret");
      if ((secret || "").trim() !== (env.AGENT_SECRET || "").trim()) {
        return new Response("Unauthorized", { status: 401, headers: cors });
      }
      const result = await runAgent(env);
      return new Response(JSON.stringify(result, null, 2), {
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    // ── Preview de email para un lead (/preview/:lead_id) ───────────────────
    const previewMatch = url.pathname.match(/^\/preview\/(\d+)$/);
    if (previewMatch && request.method === "GET") {
      const secret = request.headers.get("x-agent-secret");
      if ((secret || "").trim() !== (env.AGENT_SECRET || "").trim()) {
        return new Response("Unauthorized", { status: 401 });
      }
      const leadId = previewMatch[1];
      try {
        const base = (env.LEADFINDER_API_URL || "").replace(/^﻿/, "").trim().replace(/\/$/, "");
        const token = (env.LEADFINDER_TOKEN || "").replace(/^﻿/, "").trim();
        const res = await fetch(`${base}/api/leads/${leadId}`, {
          headers: { "X-Client-Token": token },
        });
        if (!res.ok) return new Response(JSON.stringify({ error: `Lead ${leadId} no encontrado` }), { status: 404, headers: { "Content-Type": "application/json" } });
        const lead = await res.json();
        const { subject, body } = await generateEmail(env, lead);
        return new Response(JSON.stringify({ lead_id: leadId, business_name: lead.business_name, email: lead.email, subject, body }, null, 2), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    // ── Configuración del agente (/config) ──────────────────────────────────
    if (url.pathname === "/config") {
      const secret = request.headers.get("x-agent-secret");
      if ((secret || "").trim() !== (env.AGENT_SECRET || "").trim()) {
        return new Response("Unauthorized", { status: 401, headers: cors });
      }
      if (request.method === "GET") {
        const context = await env.AGENT_CONFIG.get("agent_context") ?? "";
        return new Response(JSON.stringify({ agent_context: context }), {
          headers: { "Content-Type": "application/json", ...cors },
        });
      }
      if (request.method === "PUT") {
        const body = await request.json();
        await env.AGENT_CONFIG.put("agent_context", body.agent_context ?? "");
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json", ...cors },
        });
      }
    }

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok", agent: "leadfinder-agent" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // ── Stats del agente (/stats) ────────────────────────────────────────────
    if (url.pathname === "/stats" && request.method === "GET") {
      const secret = request.headers.get("x-agent-secret");
      if ((secret || "").trim() !== (env.AGENT_SECRET || "").trim()) {
        return new Response("Unauthorized", { status: 401 });
      }
      try {
        const base = (env.LEADFINDER_API_URL || "").replace(/^﻿/, "").trim().replace(/\/$/, "");
        const token = (env.LEADFINDER_TOKEN || "").replace(/^﻿/, "").trim();
        const res = await fetch(`${base}/api/leads`, { headers: { "X-Client-Token": token } });
        const leads = await res.json();
        const contactados = leads.filter(l => l.contact_status === "Contactado");
        const noContactadosEmail = leads.filter(l => l.contact_status === "No contactado" && l.email);
        const noContactadosTel = leads.filter(l => l.contact_status === "No contactado" && !l.email && l.phone);
        return new Response(JSON.stringify({
          total: leads.length,
          contactados: contactados.length,
          pendientes_email: noContactadosEmail.length,
          pendientes_tel: noContactadosTel.length,
          contactados_recientes: contactados.slice(0, 20).map(l => ({
            id: l.id, business_name: l.business_name, niche: l.niche,
            email: l.email, phone: l.phone, city: l.city,
          })),
        }, null, 2), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
      }
    }

    // ── Historial de ejecuciones (/history) ─────────────────────────────────
    if (url.pathname === "/history" && request.method === "GET") {
      const secret = request.headers.get("x-agent-secret");
      if ((secret || "").trim() !== (env.AGENT_SECRET || "").trim()) {
        return new Response("Unauthorized", { status: 401, headers: cors });
      }
      const raw = await env.AGENT_CONFIG.get("run_history");
      const history = raw ? JSON.parse(raw) : [];
      return new Response(JSON.stringify(history), {
        headers: { "Content-Type": "application/json", ...cors },
      });
    }

    return new Response("Finder App — Agente IA", { status: 200 });
  },
};

// ── Lógica principal del agente ─────────────────────────────────────────────
async function runAgent(env) {
  console.log("[Agent] Iniciando ejecución —", new Date().toISOString());

  const sent = [];
  const skipped = [];
  const errors = [];

  let leads;
  try {
    leads = await getNewLeads(env);
    console.log(`[Agent] Leads nuevos encontrados: ${leads.length}`);
  } catch (err) {
    console.error("[Agent] Error al obtener leads:", err.message);
    return { ok: false, error: err.message };
  }

  // Limitar para no exceder cuotas
  const toProcess = leads.slice(0, MAX_LEADS_PER_RUN);

  for (const lead of toProcess) {
    try {
      if (lead.email) {
        // Generar email personalizado con Claude Haiku
        const { subject, body } = await generateEmail(env, lead);

        // Enviar email
        await sendLeadEmail(env, lead, subject, body);

        // Actualizar estado en LeadFinder
        await markContacted(env, lead.id);

        sent.push(lead);
        console.log(`[Agent] ✅ Email enviado → ${lead.business_name} (${lead.email})`);
      } else {
        // Tiene teléfono pero no email — queda para la llamada (Fase B)
        skipped.push(lead);
        console.log(`[Agent] ⏭️  Sin email → ${lead.business_name} (${lead.phone})`);
      }
    } catch (err) {
      errors.push(`${lead.business_name}: ${err.message}`);
      console.error(`[Agent] ❌ Error con ${lead.business_name}:`, err.message);
    }
  }

  const result = {
    ok: true,
    timestamp: new Date().toISOString(),
    total: toProcess.length,
    sent: sent.length,
    skipped: skipped.length,
    errors: errors.length,
    error_details: errors,
  };

  // Guardar en historial (KV — últimas 50 ejecuciones)
  if (env.AGENT_CONFIG) {
    try {
      const raw = await env.AGENT_CONFIG.get("run_history");
      const history = raw ? JSON.parse(raw) : [];
      history.unshift({
        timestamp: result.timestamp,
        sent: result.sent,
        skipped: result.skipped,
        errors: result.errors,
        total: result.total,
        ok: result.ok,
      });
      await env.AGENT_CONFIG.put("run_history", JSON.stringify(history.slice(0, 50)));
    } catch (err) {
      console.error("[Agent] Error guardando historial:", err.message);
    }
  }

  // Enviar reporte resumen al usuario
  try {
    await sendSummaryEmail(env, { sent, skipped, errors, total: toProcess.length });
    console.log("[Agent] Resumen enviado a", env.SUMMARY_EMAIL);
  } catch (err) {
    console.error("[Agent] Error enviando resumen:", err.message);
  }

  console.log("[Agent] Ejecución completada:", result);
  return result;
}
