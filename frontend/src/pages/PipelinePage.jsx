import { useEffect, useMemo, useState } from "react";
import { getLeads, updateContactStatus } from "../api";
import { CONTACT_STATUS_OPTIONS, PRIORITY_BADGE, scoreColor } from "../constants";
import Icon from "../components/Icon";
import LeadModal from "../components/LeadModal";

const STAGE_ICON = {
  "No contactado": "users",
  "Por llamar": "phone",
  Contactado: "messageSquare",
  "Reunion agendada": "calendar",
  Cerrado: "check",
  Descartado: "x",
};

const STAGE_COLOR = {
  "No contactado": "#6b7280",
  "Por llamar": "#7c3aed",
  Contactado: "#2563eb",
  "Reunion agendada": "#d97706",
  Cerrado: "#16a34a",
  Descartado: "#dc2626",
};

function isOverdue(lead) {
  return lead.next_follow_up && new Date(lead.next_follow_up) < new Date();
}

export default function PipelinePage() {
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState("");
  const [activeLead, setActiveLead] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const [search, setSearch] = useState("");
  const [nicheFilter, setNicheFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");

  useEffect(() => { refresh(); }, []);

  function refresh() {
    getLeads().then(setLeads).catch((err) => setError(err.message));
  }

  async function moveLead(leadId, newStatus) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, contact_status: newStatus } : l)));
    try {
      await updateContactStatus(leadId, newStatus);
    } catch (err) {
      setError(err.message);
      refresh();
    }
  }

  function handleLeadUpdated(updated) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
    setActiveLead((prev) => (prev ? { ...prev, ...updated } : prev));
  }

  function onDragStart(e, leadId) {
    e.dataTransfer.setData("text/plain", String(leadId));
  }

  function onDrop(e, stage) {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = Number(e.dataTransfer.getData("text/plain"));
    if (leadId) moveLead(leadId, stage);
  }

  const uniqueNiches = useMemo(() => [...new Set(leads.map((l) => l.niche).filter(Boolean))].sort(), [leads]);
  const uniqueCities = useMemo(() => [...new Set(leads.map((l) => l.city).filter(Boolean))].sort(), [leads]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (nicheFilter && l.niche !== nicheFilter) return false;
      if (cityFilter && l.city !== cityFilter) return false;
      if (q && !l.business_name.toLowerCase().includes(q) && !(l.niche || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [leads, nicheFilter, cityFilter, search]);

  const leadsByStage = useMemo(() =>
    CONTACT_STATUS_OPTIONS.reduce((acc, stage) => {
      acc[stage] = filteredLeads.filter((l) => l.contact_status === stage);
      return acc;
    }, {}),
  [filteredLeads]);

  const hasFilters = search || nicheFilter || cityFilter;

  return (
    <div>
      <div className="page-header">
        <h2>Pipeline de prospeccion</h2>
        <p>Arrastra los leads entre columnas para actualizar su estado. Filtra para enfocarte en lo que importa.</p>
      </div>

      {error && (
        <div className="banner banner-danger" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "inline-flex", padding: 0 }}>
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      {/* Barra de filtros */}
      <div className="card" style={{ padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {/* Búsqueda */}
        <div style={{ flex: 2, minWidth: 200, position: "relative" }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", pointerEvents: "none" }}>
            <Icon name="search" size={14} />
          </span>
          <input
            placeholder="Buscar negocio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", paddingLeft: 30, borderRadius: 7, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: 13, height: 36, boxSizing: "border-box" }}
          />
        </div>

        {/* Filtro nicho */}
        <select
          value={nicheFilter}
          onChange={(e) => setNicheFilter(e.target.value)}
          style={{ flex: 1, minWidth: 150, fontSize: 13, padding: "0 10px", borderRadius: 7, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: nicheFilter ? "var(--color-text)" : "var(--color-text-muted)", height: 36, cursor: "pointer" }}
        >
          <option value="">Todos los nichos</option>
          {uniqueNiches.map((n) => (
            <option key={n} value={n}>{n} ({leads.filter((l) => l.niche === n).length})</option>
          ))}
        </select>

        {/* Filtro ciudad */}
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          style={{ flex: 1, minWidth: 150, fontSize: 13, padding: "0 10px", borderRadius: 7, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: cityFilter ? "var(--color-text)" : "var(--color-text-muted)", height: 36, cursor: "pointer" }}
        >
          <option value="">Todas las ciudades</option>
          {uniqueCities.map((c) => (
            <option key={c} value={c}>{c} ({leads.filter((l) => l.city === c).length})</option>
          ))}
        </select>

        {/* Limpiar filtros */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setNicheFilter(""); setCityFilter(""); }}
            style={{ height: 36, padding: "0 12px", borderRadius: 7, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-muted)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}
          >
            <Icon name="x" size={13} /> Limpiar
          </button>
        )}

        <span style={{ fontSize: 12, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
          {filteredLeads.length} de {leads.length} leads
        </span>
      </div>

      {/* Tablero */}
      <div className="pipeline-board">
        {CONTACT_STATUS_OPTIONS.map((stage) => {
          const stageColor = STAGE_COLOR[stage] || "#6b7280";
          return (
            <div
              key={stage}
              className={`pipeline-column ${dragOverStage === stage ? "drag-over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage); }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => onDrop(e, stage)}
            >
              <div className="pipeline-column-header" style={{ borderTop: `3px solid ${stageColor}` }}>
                <span style={{ color: stageColor, display: "flex", alignItems: "center" }}>
                  <Icon name={STAGE_ICON[stage] || "users"} size={14} />
                </span>
                <span style={{ fontWeight: 600 }}>{stage}</span>
                <span className="pipeline-count">{leadsByStage[stage].length}</span>
              </div>
              <div className="pipeline-column-body">
                {leadsByStage[stage].length === 0 && (
                  <p className="pipeline-empty">Sin leads</p>
                )}
                {leadsByStage[stage].map((lead) => (
                  <div
                    key={lead.id}
                    className="pipeline-card"
                    draggable
                    onDragStart={(e) => onDragStart(e, lead.id)}
                    onClick={() => setActiveLead(lead)}
                  >
                    <div className="pipeline-card-top">
                      <strong style={{ fontSize: 13 }}>{lead.business_name}</strong>
                      <span className={`badge ${PRIORITY_BADGE[lead.priority] || "badge-muted"}`} style={{ fontSize: 10 }}>
                        {lead.priority || "—"}
                      </span>
                    </div>
                    <p className="pipeline-card-meta">{lead.niche} · {lead.city}</p>
                    {lead.phone && (
                      <p className="pipeline-card-meta" style={{ fontSize: 11 }}>
                        <Icon name="phone" size={10} /> {lead.phone}
                      </p>
                    )}
                    <div className="pipeline-card-footer">
                      <span style={{ fontWeight: 700, color: scoreColor(lead.score), fontSize: 11 }}>
                        {lead.score}pts
                      </span>
                      {lead.next_follow_up && (
                        <span className={`pipeline-followup ${isOverdue(lead) ? "overdue" : ""}`}>
                          <Icon name="calendar" size={11} />
                          {new Date(lead.next_follow_up).toLocaleDateString("es", { day: "2-digit", month: "short" })}
                        </span>
                      )}
                    </div>
                    {/* Selector de etapa — solo visible en móvil via CSS */}
                    <select
                      className="pipeline-move-btn"
                      value={lead.contact_status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => moveLead(lead.id, e.target.value)}
                      style={{ display: "none", marginTop: 8, width: "100%", fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)", cursor: "pointer" }}
                    >
                      {CONTACT_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {activeLead && (
        <LeadModal lead={activeLead} onClose={() => setActiveLead(null)} onUpdated={handleLeadUpdated} />
      )}
    </div>
  );
}
