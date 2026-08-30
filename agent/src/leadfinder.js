// Cliente para la API de LeadFinder

function clean(raw) {
  return (raw || "").replace(/^\uFEFF/, "").trim();
}

function cleanUrl(raw) {
  return clean(raw).replace(/\/$/, "");
}

export async function getNewLeads(env) {
  const base = cleanUrl(env.LEADFINDER_API_URL);
  const token = clean(env.LEADFINDER_TOKEN);
  const url = `${base}/api/leads`;

  const res = await fetch(url, {
    headers: { "X-Client-Token": token },
  });

  if (!res.ok) throw new Error(`LeadFinder GET /api/leads: ${res.status}`);
  const leads = await res.json();

  const filtered = leads.filter(
    (l) => l.contact_status === "No contactado" && (l.email || l.phone)
  );
  // Email-first: prioriza leads con email para envio hoy; telefono-only queda para Fase B
  filtered.sort((a, b) => (b.email ? 1 : 0) - (a.email ? 1 : 0));
  return filtered;
}

export async function markContacted(env, leadId) {
  const base = cleanUrl(env.LEADFINDER_API_URL);
  const token = clean(env.LEADFINDER_TOKEN);
  const url = `${base}/api/leads/${leadId}/contact-status`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "X-Client-Token": token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ contact_status: "Contactado" }),
  });
  if (!res.ok) throw new Error(`LeadFinder PATCH status ${leadId}: ${res.status}`);
  return res.json();
}