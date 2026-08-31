// Genera email personalizado usando Claude Haiku

const AGENCY_CONTEXT = `
Agencia: Agencia Shop Services LLC
Ubicación: Miami, Florida — atendemos negocios locales en todo EE.UU., especialmente comunidades hispanas.
Especialidades: sitios web en Shopify y WordPress, SEO local, Google Business Profile (Google Maps),
redes sociales (Instagram, Facebook), campañas de Google Ads y Facebook/Instagram Ads,
automatizaciones de marketing y agentes de IA para ventas.
Experiencia: hemos trabajado con dentistas, clínicas, realtors, restaurantes, salones de belleza,
servicios de limpieza, contratistas y tiendas locales.
Propuesta de valor: ayudamos a negocios locales a conseguir más clientes por internet sin que
el dueño tenga que aprender tecnología. Resultados medibles en 30–60 días.
Objetivo del email: conseguir una llamada de 15 minutos, no vender directamente.
Restricciones: nunca mencionar precios, nunca prometer resultados exactos, no sonar como spam.
`.trim();

const SYSTEM_PROMPT = `Eres el asesor de ventas de Agencia Shop Services LLC, una agencia de marketing digital
especializada en negocios locales hispanos en EE.UU.

CONTEXTO DE LA AGENCIA:
${AGENCY_CONTEXT}

Tu tarea es escribir un email frío corto, directo y personalizado para contactar a un negocio local.
El email debe sonar humano y genuino, como si lo escribiera una persona real, no un robot.
Máximo 5 oraciones. Sin saludos genéricos como "Espero que estés bien".
Menciona algo específico del negocio (nicho, ciudad, problema detectado) para mostrar que investigaste.
Cierra siempre con una pregunta o invitación a una llamada de 15 minutos.
Responde SOLO con JSON válido: { "subject": "...", "body": "..." }`;

function clean(raw) {
  return (raw || "").replace(/^﻿/, "").trim();
}

export async function generateEmail(env, lead) {
  const gaps = parseGaps(lead.marketing_gaps);
  const gapSummary = gaps.length
    ? gaps.map((g) => g.label).join(", ")
    : "presencia digital limitada";

  const lang = lead.detected_language?.startsWith("en") ? "English" : "espanol";

  const kvContext = env.AGENT_CONFIG ? await env.AGENT_CONFIG.get("agent_context") : null;
  const extraContext = kvContext ?? clean(env.AGENT_CONTEXT);
  const userMsg = `
Negocio: ${lead.business_name}
Nicho: ${lead.niche}
Ciudad: ${lead.city}, ${lead.state || ""}
Problemas detectados: ${gapSummary}
Idioma del negocio: ${lang}
Servicios destacados para este lead: ${clean(env.AGENT_SERVICES) || "sitio web, SEO local, redes sociales, Google Maps"}
Firmante: ${clean(env.AGENT_NAME) || "Agencia Shop Services"}
${extraContext ? `\nContexto adicional de la agencia:\n${extraContext}` : ""}

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
