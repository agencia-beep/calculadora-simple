// LeadFinder Call Agent — Cloudflare Worker
// Dispara llamadas de IA via Vapi.ai y recibe webhooks con resultados

const CRM_URL = "https://leadfinder-crm.agenciashopservices.workers.dev";
const VAPI_API_URL = "https://api.vapi.ai";

function clean(s) {
  return (s || "").replace(/^﻿/, "").trim();
}

function cors(res) {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type,x-call-secret");
  return new Response(res.body, { status: res.status, headers: h });
}

function json(data, status = 200) {
  return cors(new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  }));
}

// ── Llamar a un lead ───────────────────────────────────────────────────────────
async function callLead(leadId, env) {
  const crmSecret = clean(env.CRM_SECRET);
  const vapiKey = clean(env.VAPI_API_KEY);
  const vapiAssistantId = clean(env.VAPI_ASSISTANT_ID);
  const vapiPhoneNumberId = clean(env.VAPI_PHONE_NUMBER_ID);

  // 1. Obtener datos del lead desde el CRM
  const leadRes = await fetch(`${CRM_URL}/leads/${leadId}`, {
    headers: { "x-crm-secret": crmSecret },
  });
  if (!leadRes.ok) return json({ error: "Lead no encontrado" }, 404);
  const lead = await leadRes.json();

  if (!lead.phone) return json({ error: "Lead sin teléfono" }, 400);

  // Limpiar número de teléfono — Vapi requiere formato E.164 (+1XXXXXXXXXX)
  let phone = lead.phone.replace(/\D/g, "");
  if (phone.length === 10) phone = "1" + phone;
  if (!phone.startsWith("+")) phone = "+" + phone;

  // 2. Construir variables dinámicas para el asistente
  const variables = {
    business_name: lead.business_name || "el negocio",
    owner_name: lead.owner_name || "",
    city: lead.city || "",
    service_type: lead.service_type || "servicios de marketing digital",
    language: lead.detected_language || "es",
  };

  // 3. Disparar llamada via Vapi
  const vapiBody = {
    assistantId: vapiAssistantId,
    phoneNumberId: vapiPhoneNumberId,
    customer: {
      number: phone,
      name: lead.business_name,
    },
    assistantOverrides: {
      variableValues: variables,
    },
    metadata: {
      lead_id: leadId,
      crm_stage: lead.stage,
    },
  };

  const vapiRes = await fetch(`${VAPI_API_URL}/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vapiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(vapiBody),
  });

  if (!vapiRes.ok) {
    const err = await vapiRes.text();
    console.error("Vapi error:", err);
    return json({ error: "Error al iniciar llamada", detail: err }, 500);
  }

  const vapiCall = await vapiRes.json();

  // 4. Registrar actividad en el CRM
  await fetch(`${CRM_URL}/leads/${leadId}/activities`, {
    method: "POST",
    headers: { "x-crm-secret": crmSecret, "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "call_initiated",
      note: `Llamada iniciada. ID Vapi: ${vapiCall.id}`,
      vapi_call_id: vapiCall.id,
    }),
  }).catch(() => {});

  // 5. Actualizar stage si está en "nuevo" → "contactado"
  if (lead.stage === "nuevo") {
    await fetch(`${CRM_URL}/leads/${leadId}`, {
      method: "PATCH",
      headers: { "x-crm-secret": crmSecret, "Content-Type": "application/json" },
      body: JSON.stringify({ stage: "contactado" }),
    }).catch(() => {});
  }

  return json({ success: true, call_id: vapiCall.id, phone });
}

// ── Lote: llamar a todos los leads con teléfono en etapa "nuevo" ───────────────
async function callBatch(env, maxCalls = 10) {
  const crmSecret = clean(env.CRM_SECRET);

  const leadsRes = await fetch(`${CRM_URL}/leads?stage=nuevo&limit=50`, {
    headers: { "x-crm-secret": crmSecret },
  });
  if (!leadsRes.ok) return json({ error: "Error obteniendo leads" }, 500);
  const data = await leadsRes.json();

  const leads = (data.leads || []).filter((l) => l.phone && !l.email);
  const toCall = leads.slice(0, maxCalls);

  const results = [];
  for (const lead of toCall) {
    try {
      const r = await callLead(lead.id, env);
      const body = await r.json();
      results.push({ lead_id: lead.id, business: lead.business_name, ...body });
    } catch (e) {
      results.push({ lead_id: lead.id, error: e.message });
    }
    // Pausa de 2 segundos entre llamadas para no saturar
    await new Promise((r) => setTimeout(r, 2000));
  }

  return json({ called: results.length, results });
}

// ── Webhook de Vapi: recibe resultado de la llamada ───────────────────────────
async function handleVapiWebhook(req, env) {
  const crmSecret = clean(env.CRM_SECRET);
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { message } = body;
  if (!message) return json({ ok: true });

  const { type, call } = message;
  const leadId = call?.metadata?.lead_id;

  if (!leadId) return json({ ok: true });

  // Tipos de eventos Vapi
  if (type === "end-of-call-report") {
    const { endedReason, summary, transcript, recordingUrl } = message;

    // Determinar resultado de la llamada
    let callResult = "sin_respuesta";
    let newStage = null;
    let note = "";

    if (endedReason === "customer-ended-call" || endedReason === "assistant-ended-call") {
      callResult = "contestada";
      newStage = "respondio";
      note = `Llamada contestada. Resumen: ${summary || "N/A"}`;
    } else if (endedReason === "voicemail") {
      callResult = "buzon_voz";
      note = "Llamada fue a buzón de voz. Se dejó mensaje.";
    } else if (endedReason === "no-answer") {
      callResult = "sin_respuesta";
      note = "No contestó la llamada.";
    } else {
      note = `Llamada terminó: ${endedReason}`;
    }

    // Registrar actividad
    const activityData = {
      type: "call_completed",
      note,
      call_result: callResult,
      vapi_call_id: call.id,
      transcript: transcript?.substring(0, 2000) || null,
      recording_url: recordingUrl || null,
    };

    await fetch(`${CRM_URL}/leads/${leadId}/activities`, {
      method: "POST",
      headers: { "x-crm-secret": crmSecret, "Content-Type": "application/json" },
      body: JSON.stringify(activityData),
    }).catch(() => {});

    // Actualizar stage si contestaron
    if (newStage) {
      await fetch(`${CRM_URL}/leads/${leadId}`, {
        method: "PATCH",
        headers: { "x-crm-secret": crmSecret, "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage, responded_at: new Date().toISOString() }),
      }).catch(() => {});
    }

    console.log(`Lead ${leadId}: ${callResult} — ${note}`);
  }

  return json({ ok: true });
}

// ── Router principal ──────────────────────────────────────────────────────────
export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return cors(new Response(null, { status: 204 }));

    const url = new URL(req.url);
    const path = url.pathname;

    // Webhook de Vapi (no requiere autenticación nuestra — lo verifica Vapi)
    if (path === "/webhook" && req.method === "POST") {
      return handleVapiWebhook(req, env);
    }

    // Rutas autenticadas
    const callSecret = clean(env.CALL_SECRET);
    const reqSecret = req.headers.get("x-call-secret");
    if (!callSecret || reqSecret !== callSecret) {
      return json({ error: "Unauthorized" }, 401);
    }

    // POST /call/:leadId — llamar a un lead específico
    const callMatch = path.match(/^\/call\/(.+)$/);
    if (callMatch && req.method === "POST") {
      return callLead(callMatch[1], env);
    }

    // POST /call-batch — llamar lote de leads sin email
    if (path === "/call-batch" && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      return callBatch(env, body.max_calls || 10);
    }

    // GET /health
    if (path === "/health") {
      return json({ status: "ok", service: "call-agent" });
    }

    return json({ error: "Not found" }, 404);
  },
};
