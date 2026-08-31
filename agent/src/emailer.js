// Envio de emails via Resend

function clean(raw) {
  return (raw || "").replace(/^﻿/, "").trim();
}

export async function sendLeadEmail(env, lead, subject, body) {
  if (!lead.email) throw new Error("Lead sin email");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clean(env.RESEND_API_KEY)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: clean(env.EMAIL_FROM),
      reply_to: clean(env.REPLY_TO_EMAIL) || clean(env.EMAIL_FROM),
      to: [lead.email],
      subject,
      text: body,
      html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend: ${res.status} - ${err}`);
  }
  return res.json();
}

export async function sendSummaryEmail(env, results) {
  const { sent, skipped, errors, total } = results;

  const lines = [
    `Reporte del Agente IA - ${new Date().toLocaleDateString("es")}`,
    ``,
    `Emails enviados: ${sent.length}`,
    `Sin email (solo llamar): ${skipped.length}`,
    `Errores: ${errors.length}`,
    `Total leads procesados: ${total}`,
  ];

  if (sent.length > 0) {
    lines.push(``, `-- Leads contactados hoy --`);
    sent.forEach((l) => lines.push(`* ${l.business_name} (${l.niche}) - ${l.email}`));
  }

  if (skipped.length > 0) {
    lines.push(``, `-- Leads pendientes de llamada --`);
    skipped.forEach((l) => lines.push(`* ${l.business_name} - ${l.phone}`));
  }

  if (errors.length > 0) {
    lines.push(``, `-- Errores --`);
    errors.forEach((e) => lines.push(`* ${e}`));
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clean(env.RESEND_API_KEY)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: clean(env.EMAIL_FROM),
      to: [clean(env.SUMMARY_EMAIL)],
      subject: `Agente IA - ${sent.length} emails enviados hoy`,
      text: lines.join("\n"),
      html: `<pre style="font-family:sans-serif;font-size:14px;">${lines.join("\n")}</pre>`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Summary email failed: ${res.status} - ${err}`);
  }
}
