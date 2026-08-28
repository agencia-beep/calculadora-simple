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
  updateSavedSearchFrequency,
} from "../api";
import SearchForm from "../components/SearchForm";
import LeadsTable from "../components/LeadsTable";
import LeadModal from "../components/LeadModal";
import Icon from "../components/Icon";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeLead, setActiveLead] = useState(null);
  const [savedSearches, setSavedSearches] = useState([]);
  const [lastForm, setLastForm] = useState(null);
  const [sinceDate, setSinceDate] = useState("");
  const [nicheFilter, setNicheFilter] = useState("");
  const [hideInPipeline, setHideInPipeline] = useState(true);

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

  async function handleFrequencyChange(id, frequency) {
    try {
      const updated = await updateSavedSearchFrequency(id, frequency);
      setSavedSearches((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
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
  const filteredLeads = leads.filter((l) => {
    if (nicheFilter && l.niche !== nicheFilter) return false;
    if (hideInPipeline && l.contact_status !== "No contactado") return false;
    return true;
  });
  const inPipelineCount = leads.filter((l) => l.contact_status !== "No contactado").length;

  return (
    <div>
      <div className="page-header">
        <h2>Buscar leads</h2>
        <p>Encuentra negocios locales con presencia digital debil o sin website.</p>
      </div>

      {error && (
        <div className="banner banner-danger" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "inline-flex", padding: 0 }}>
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      <SearchForm
        onSearch={handleSearch}
        onSaveSearch={handleSaveSearch}
        loading={loading}
        savedSearches={savedSearches}
        onRunSaved={handleRunSavedSearch}
        onDeleteSaved={handleDeleteSavedSearch}
        onFrequencyChange={handleFrequencyChange}
      />

      <div className="card" style={{ marginTop: 20, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid var(--color-border)", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{filteredLeads.length}</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: 14 }}>leads</span>
            {nicheFilter && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, background: "var(--color-primary)", color: "#fff", padding: "3px 6px 3px 10px", borderRadius: 999 }}>
                {nicheFilter}
                <button onClick={() => setNicheFilter("")} style={{ display: "inline-flex", color: "#fff", cursor: "pointer", border: "none", background: "none", padding: 0 }}>
                  <Icon name="x" size={13} />
                </button>
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => setHideInPipeline((v) => !v)}
              style={{
                height: 32, padding: "0 12px", borderRadius: 7, border: "1px solid var(--color-border)",
                background: hideInPipeline ? "var(--color-primary)" : "var(--color-surface)",
                color: hideInPipeline ? "#fff" : "var(--color-text-muted)",
                cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", fontWeight: 500,
              }}
              title={hideInPipeline ? "Mostrando solo 'No contactado' — clic para ver todos" : "Mostrando todos — clic para ocultar los que están en pipeline"}
            >
              <Icon name="filter" size={12} />
              {hideInPipeline
                ? <>Solo nuevos {inPipelineCount > 0 && <span style={{ opacity: 0.8, marginLeft: 2 }}>({inPipelineCount} en pipeline)</span>}</>
                : "Ver todos"}
            </button>
            <select
              value={nicheFilter}
              onChange={(e) => setNicheFilter(e.target.value)}
              style={{ fontSize: 13, padding: "5px 10px", borderRadius: 7, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text)", cursor: "pointer" }}
            >
              <option value="">Todos los nichos</option>
              {uniqueNiches.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <label style={{ fontSize: 13, color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
              Desde
              <input type="date" value={sinceDate} onChange={(e) => handleSinceChange(e.target.value)} style={{ fontSize: 13 }} />
            </label>
            <a className="btn btn-secondary" href={exportCsvUrl()} style={{ fontSize: 13, padding: "5px 12px" }}>
              <Icon name="download" size={13} /> CSV
            </a>
            <a className="btn btn-secondary" href={exportXlsxUrl()} style={{ fontSize: 13, padding: "5px 12px" }}>
              <Icon name="download" size={13} /> Excel
            </a>
          </div>
        </div>

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
