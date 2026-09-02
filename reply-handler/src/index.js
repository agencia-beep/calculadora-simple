// LeadFinder Reply Handler — Cloudflare Email Worker
// Recibe emails en replies@agenciashopservices.com,
// detecta si el remitente es un lead del CRM y lo mueve a "respondio",
// luego reenvía el email a Gmail.

const CRM_URL = "https://leadfinder-crm.agenciashopservices.workers.dev";
const FORWARD_TO = "agenciashopservices@gmail.com";

function clean(s) {
  return (s || "").replace(/^﻿/, "").trim();
}

export default {
  async email(message, env, ctx) {
    const crmSecret = clean(env.CRM_SECRET);
    const fromEmail = message.from?.toLowerCase().trim();

    // 1. Siempre reenviar a Gmail para que el usuario vea la respuesta
    try {
      await message.forward(FORWARD_TO);
    } catch (e) {
      console.error("Error reenviando email:", e.message);
    }

    if (!fromEmail || !crmSecret) return;

    // 2. Buscar el lead en el CRM por email
    let lead = null;
    try {
      const resp = await fetch(
        `${CRM_URL}/leads?q=${encodeURIComponent(fromEmail)}&limit=5`,
        { headers: { "x-crm-secret": crmSecret, "Content-Type": "application/json" } }
      );
      if (!resp.ok) return;
      const data = await resp.json();
      // Buscar coincidencia exacta de email
      lead = (data.leads || []).find(
        (l) => l.email?.toLowerCase().trim() === fromEmail
      );
    } catch (e) {
      console.error("Error buscando lead:", e.message);
      return;
    }

    if (!lead) {
      console.log(`Email de ${fromEmail} no coincide con ningún lead del CRM`);
      return;
    }

    // 3. Solo actualizar si está en etapa "contactado" (evitar sobreescribir progreso)
    const etapasActualizables = ["contactado", "nuevo"];
    if (!etapasActualizables.includes(lead.stage)) {
      console.log(`Lead ${lead.id} ya está en etapa "${lead.stage}", no se actualiza`);
      return;
    }

    // 4. Mover a "respondio" y registrar actividad
    try {
      await fetch(`${CRM_URL}/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "x-crm-secret": crmSecret, "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "respondio",
          responded_at: new Date().toISOString(),
        }),
      });
      console.log(`Lead ${lead.id} (${lead.business_name}) movido a "respondio"`);
    } catch (e) {
      console.error("Error actualizando lead:", e.message);
    }
  },
};
