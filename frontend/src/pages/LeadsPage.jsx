import { useEffect, useState } from "react";
import {
  createSavedSearch,
  deleteLead,
  deleteSavedSearch,
  exportCsvUrl,
  exportXlsxUrl,
  getLeads,
  getSavedSearches,
  runSavedSearch,
  searchLeads,
  updateContactStatus,
} from "../api";
import SearchForm from "../components/SearchForm";
import LeadsTable from "../components/LeadsTable";
import LeadModal from "../components/LeadModal";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeLead, setActiveLead] = useState(null);
  const [savedSearches, setSavedSearches] = useState([]);
  const [lastForm, setLastForm] = useState(null);
  const [sinceDate, setSinceDate] = useState("");
  const [nicheFilter, setNicheFilter] = useState("");

  useEffect(() => {
    refresh();
    refreshSavedSearches();
  }, []);

  function refresh(since) {
    const sinceIso = since ? new Date(since).toISOString() : undefined;
    getLeads(sinceIso)
      .then(setLeads)
      .catch((err) => setError(err.message));
  }

  function refreshSavedSearches() {
    getSavedSearches()
      .then(setSavedSearches)
      .catch((err) => setError(err.message));
  }

  async function handleSearch(form) {
    setLoading(true);
    setError("");
    setLastForm(form);
    try {
      await searchLeads(form);
      refresh(sinceDate);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSearch(form) {
    const name = prompt("Nombre para esta busqueda guardada:", form.niche);
    if (!name) return;
    setError("");
    try {
      await createSavedSearch({ ...form, name });
      refreshSavedSearches();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRunSavedSearch(id) {
    setLoading(true);
    setError("");
    try {
      await runSavedSearch(id);
      refresh(sinceDate);
      refreshSavedSearches();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSavedSearch(id) {
    if (!confirm("Eliminar esta busqueda guardada?")) return;
    try {
      await deleteSavedSearch(id);
      setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  function handleSinceChange(value) {
    setSinceDate(value);
    refresh(value);
  }

  async function handleContactStatusChange(leadId, status) {
    try {
      const updated = await updateContactStatus(leadId, status);
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...updated } : l)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(leadId) {
    if (!confirm("Eliminar este lead?")) return;
    try {
      await deleteLead(leadId);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLeadUpdated(updated) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
    setActiveLead((prev) => ({ ...prev, ...updated }));
  }

  const uniqueNiches = [...new Set(leads.map((l) => l.niche).filter(Boolean))].sort();
  const filteredLeads = nicheFilter ? leads.filter((l) => l.niche === nicheFilter) : leads;

  return (
    <div>
      <div className="page-header">
        <h2>Buscar leads</h2>
        <p>Encuentra negocios locales con presencia digital debil o sin website.</p>
      </div>

      {error && (
        <div className="banner banner-danger" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "inherit", fontWeight: 700, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {savedSearches.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h4 style={{ marginTop: 0 }}>Busquedas guardadas</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {savedSearches.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <strong>{s.name}</strong>{" "}
                  <span style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                    {s.niche} · {s.city || s.zip_code} {s.country}
                  </span>
                  {s.last_run_at && (
                    <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>
                      {" "}
                      · ultima vez: {new Date(s.last_run_at).toLocaleString()}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-secondary btn-small" onClick={() => handleRunSavedSearch(s.id)} disabled={loading}>
                    Buscar ahora
                  </button>
                  <button className="btn btn-secondary btn-small" onClick={() => handleDeleteSavedSearch(s.id)}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <SearchForm onSearch={handleSearch} onSaveSearch={handleSaveSearch} loading={loading} />

      <div className="card" style={{ marginTop: 20 }}>
        <div className="toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <strong>{filteredLeads.length} leads</strong>
            {nicheFilter && (
              <span style={{ fontSize: 12, background: "var(--color-primary)", color: "#fff", padding: "2px 10px", borderRadius: 999 }}>
                {nicheFilter}
                <button onClick={() => setNicheFilter("")} style={{ marginLeft: 6, color: "#fff", fontWeight: 700, cursor: "pointer", border: "none", background: "none", fontSize: 12 }}>✕</button>
              </span>
            )}
          </div>
          <div className="toolbar-actions" style={{ alignItems: "center" }}>
            <select
              value={nicheFilter}
              onChange={(e) => setNicheFilter(e.target.value)}
              style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", cursor: "pointer" }}
            >
              <option value="">Todos los nichos</option>
              {uniqueNiches.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <label style={{ fontSize: 13, color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              Nuevos desde
              <input type="date" value={sinceDate} onChange={(e) => handleSinceChange(e.target.value)} />
            </label>
            <a className="btn btn-secondary" href={exportCsvUrl()} download>
              Exportar CSV
            </a>
            <a className="btn btn-secondary" href={exportXlsxUrl()} download>
              Exportar Excel
            </a>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <LeadsTable
          leads={filteredLeads}
          onContactStatusChange={handleContactStatusChange}
          onOpenLead={setActiveLead}
          onDelete={handleDelete}
        />
      </div>

      {activeLead && (
        <LeadModal lead={activeLead} onClose={() => setActiveLead(null)} onUpdated={handleLeadUpdated} />
      )}
    </div>
  );
}
