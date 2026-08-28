const BASE_URL = import.meta.env.VITE_API_URL || "/api";
const CLIENT_TOKEN_KEY = "client_token";

export class AuthError extends Error {}

export function getClientToken() {
  return localStorage.getItem(CLIENT_TOKEN_KEY) || "";
}

export function setClientToken(token) {
  localStorage.setItem(CLIENT_TOKEN_KEY, token);
}

export function clearClientToken() {
  localStorage.removeItem(CLIENT_TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getClientToken();
  if (token) headers["X-Client-Token"] = token;

  const resp = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (resp.status === 401) {
    clearClientToken();
    window.dispatchEvent(new Event("auth-error"));
    throw new AuthError("Token invalido o ausente");
  }

  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const data = await resp.json();
      detail = data.detail || detail;
    } catch (e) {
      // ignore
    }
    throw new Error(detail);
  }

  return resp;
}

export async function getHealth() {
  const resp = await request("/health");
  return resp.json();
}

export async function searchLeads(payload) {
  const resp = await request("/search", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return resp.json();
}

export async function getLeads(since) {
  const query = since ? `?since=${encodeURIComponent(since)}` : "";
  const resp = await request(`/leads${query}`);
  return resp.json();
}

export async function updateContactStatus(leadId, contactStatus) {
  const resp = await request(`/leads/${leadId}/contact-status`, {
    method: "PATCH",
    body: JSON.stringify({ contact_status: contactStatus }),
  });
  return resp.json();
}

export async function generateMessages(leadId) {
  const resp = await request(`/leads/${leadId}/messages`, { method: "POST" });
  return resp.json();
}

export async function generateDemo(leadId) {
  const resp = await request(`/leads/${leadId}/demo`, { method: "POST" });
  return resp.json();
}

export async function deleteLead(leadId) {
  await request(`/leads/${leadId}`, { method: "DELETE" });
}

export async function getDashboard() {
  const resp = await request("/dashboard");
  return resp.json();
}

export function exportCsvUrl() {
  const token = getClientToken();
  return `${BASE_URL}/export/csv${token ? `?token=${encodeURIComponent(token)}` : ""}`;
}

export async function getNiches() {
  const resp = await request("/niches");
  return resp.json();
}

export function exportXlsxUrl({ niche, date_from, date_to } = {}) {
  const params = new URLSearchParams();
  if (niche) params.set("niche", niche);
  if (date_from) params.set("date_from", date_from);
  if (date_to) params.set("date_to", date_to);
  const token = getClientToken();
  if (token) params.set("token", token);
  const query = params.toString();
  return `${BASE_URL}/export/xlsx${query ? `?${query}` : ""}`;
}

export async function getSavedSearches() {
  const resp = await request("/saved-searches");
  return resp.json();
}

export async function createSavedSearch(payload) {
  const resp = await request("/saved-searches", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return resp.json();
}

export async function deleteSavedSearch(id) {
  await request(`/saved-searches/${id}`, { method: "DELETE" });
}

export async function updateSavedSearchFrequency(id, frequency) {
  const resp = await request(`/saved-searches/${id}/frequency`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frequency }),
  });
  return resp.json();
}

export async function runSavedSearch(id) {
  const resp = await request(`/saved-searches/${id}/run`, { method: "POST" });
  return resp.json();
}

export async function updateFollowUp(leadId, nextFollowUp) {
  const resp = await request(`/leads/${leadId}/follow-up`, {
    method: "PATCH",
    body: JSON.stringify({ next_follow_up: nextFollowUp }),
  });
  return resp.json();
}

export async function getLeadNotes(leadId) {
  const resp = await request(`/leads/${leadId}/notes`);
  return resp.json();
}

export async function createLeadNote(leadId, text) {
  const resp = await request(`/leads/${leadId}/notes`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
  return resp.json();
}

export async function deleteLeadNote(leadId, noteId) {
  await request(`/leads/${leadId}/notes/${noteId}`, { method: "DELETE" });
}

export async function getLeadActivity(leadId) {
  const resp = await request(`/leads/${leadId}/activity`);
  return resp.json();
}
// ── Sequences ─────────────────────────────────────────

export async function getSequences() {
  const resp = await request("/sequences");
  return resp.json();
}

export async function createSequence(payload) {
  const resp = await request("/sequences", { method: "POST", body: JSON.stringify(payload) });
  return resp.json();
}

export async function deleteSequence(id) {
  await request(`/sequences/${id}`, { method: "DELETE" });
}

export async function enrollLead(sequenceId, leadId) {
  const resp = await request(`/sequences/${sequenceId}/enroll/${leadId}`, { method: "POST" });
  return resp.json();
}

export async function getDueEnrollments() {
  const resp = await request("/sequences/enrollments/due");
  return resp.json();
}

export async function getLeadEnrollments(leadId) {
  const resp = await request(`/sequences/enrollments/lead/${leadId}`);
  return resp.json();
}

export async function advanceEnrollment(enrollmentId) {
  const resp = await request(`/sequences/enrollments/${enrollmentId}/advance`, { method: "POST" });
  return resp.json();
}

export async function stopEnrollment(enrollmentId) {
  await request(`/sequences/enrollments/${enrollmentId}/stop`, { method: "POST" });
}
