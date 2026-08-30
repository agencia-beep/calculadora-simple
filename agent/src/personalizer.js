// Genera email personalizado usando Claude Haiku

const SYSTEM_PROMPT = `Eres un experto en ventas B2B para una agencia de marketing digital.
Tu trabajo es escribir emails frios cortos, directos y personalizados para contactar negocios locales.
El email debe sonar humano, no robotico. Maximo 5 oraciones. Sin saludos genericos.
Responde SOLO con JSON: { "subject": "...", "body": "..." }`;

function clean(raw) {
  return (raw || "").replace(/^﻿/, "").trim();
}

export async function generateEmail(env, lead) {
  const gaps = parseGaps(lead.marketing_gaps);
  const gapSummary = gaps.length
    ? gaps.map((g) => g.label).join(", ")
    : "presencia digital limitada";

  const lang = lead.detected_language?.startsWith("en") ? "English" : "espanol";

  const userMsg = `
Negocio: ${lead.business_name}
Nicho: ${lead.niche}
Ciudad: ${lead.city}, ${lead.state || ""}
Problemas detectados: ${gapSummary}
Idioma: ${lang}
Servicios que ofrezco: ${clean(env.AGENT_SERVICES) || "sitio web, SEO local, redes sociales, Google Maps"}
Mi nombre/agencia: ${clean(env.AGENT_NAME) || "Agencia Shop Services"}

Escribe el email en ${lang}.`.trim();

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": clean(env.ANTHROPIC_API_KEY),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API: ${res.status}`);
  const data = await res.json();
  const text = data.content[0].text.trim();

  try {
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match[0]);
  } catch {
    return { subject: `Hola ${lead.business_name}`, body: text };
  }
}

function parseGaps(raw) {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
