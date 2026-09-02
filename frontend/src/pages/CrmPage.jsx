import { useState, useEffect, useCallback } from "react";

const CRM_URL = "https://leadfinder-crm.agenciashopservices.workers.dev";
const CRM_SECRET = "crm2025secret";

const STAGES = [
  { key: "nuevo",       label: "Nuevo",        color: "#6366f1", bg: "#ede9fe" },
  { key: "contactado",  label: "Contactado",   color: "#0ea5e9", bg: "#e0f2fe" },
  { key: "respondio",   label: "Respondió",    color: "#8b5cf6", bg: "#f3e8ff" },
  { key: "propuesta",   label: "Propuesta",    color: "#f59e0b", bg: "#fef3c7" },
  { key: "negociacion", label: "Negociación",  color: "#f97316", bg: "#ffedd5" },
  { key: "cliente",     label: "Cliente",      color: "#10b981", bg: "#d1fae5" },
  { key: "sin_interes", label: "Sin interés",  color: "#94a3b8", bg: "#f1f5f9" },
  { key: "reimpactar",  label: "Reimpactar",   color: "#ec4899", bg: "#fce7f3" },
];

const SERVICE_LABELS = {
  web: "Sitio Web", landing: "Landing Page", logo: "Logo",
  marketing: "Marketing", app: "Web App", otro: "Otro",
};

function crmFetch(path, options = {}) {
  return fetch(`${CRM_URL}${path}`, {
    ...options,
    headers: {
      "x-crm-secret": CRM_SECRET,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  }).then(async (r) => {
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  });
}

function stageInfo(key) {
  return STAGES.find((s) => s.key === key) || { label: key, color: "#64748b", bg: "#f8fafc" };
}

function StagePill({ stage }) {
  const s = stageInfo(stage);
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 700, padding: "2px 8px",
      borderRadius: 20, background: s.bg, color: s.color, whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

function ScoreDot({ score }) {
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 12, fontWeight: 600, color,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      {score}
    </span>
  );
}

// ── Lead card en el Kanban ────────────────────────────────────────────────────
function KanbanCard({ lead, onClick }) {
  return (
    <div
      className="crm-card"
      onClick={() => onClick(lead)}
      style={{ cursor: "pointer" }}
    >
      <div className="crm-card-title">{lead.business_name}</div>
      <div className="crm-card-meta">
        {lead.niche && <span className="tag" style={{ fontSize: 11 }}>{lead.niche}</span>}
        {lead.city && <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>{lead.city}, {lead.state}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
        <ScoreDot score={lead.score || 0} />
        {lead.deal_value > 0 && (
          <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>
            ${Number(lead.deal_value).toLocaleString()}
          </span>
        )}
        {lead.service_interest && (
          <span style={{ fontSize: 10, color: "var(--color-text-muted)", background: "var(--color-bg-alt)", borderRadius: 4, padding: "2px 5px" }}>
            {SERVICE_LABELS[lead.service_interest] || lead.service_interest}
          </span>
        )}
      </div>
      {lead.next_followup_at && (
        <div style={{ marginTop: 6, fontSize: 11, color: "#f59e0b" }}>
          ⏰ {new Date(lead.next_followup_at).toLocaleDateString("es")}
        </div>
      )}
    </div>
  );
}

// ── Panel lateral de detalle ──────────────────────────────────────────────────
function LeadDetailPanel({ leadId, onClose, onSaved }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [tab, setTab] = useState("info"); // info | notes | activity
  const [patch, setPatch] = useState({});
  const [saved, setSaved] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    crmFetch(`/leads/${leadId}`)
      .then((d) => { setLead(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [leadId]);

  useEffect(() => { reload(); }, [reload]);

  async function handleSave() {
    if (!Object.keys(patch).length) return;
    setSaving(true);
    try {
      await crmFetch(`/leads/${leadId}`, { method: "PATCH", body: JSON.stringify(patch) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setPatch({});
      reload();
      onSaved();
    } catch (e) {
      alert("Error: " + e.message);
    } finally { setSaving(false); }
  }

  async function handleAddNote() {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await crmFetch(`/leads/${leadId}/notes`, { method: "POST", body: JSON.stringify({ content: newNote.trim() }) });
      setNewNote("");
      reload();
    } catch (e) { alert(e.message); }
    finally { setAddingNote(false); }
  }

  function field(key, value) {
    return (patch[key] !== undefined ? patch[key] : value) ?? "";
  }

  if (loading) return (
    <div className="crm-detail-panel">
      <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-muted)" }}>Cargando...</div>
    </div>
  );

  if (!lead) return (
    <div className="crm-detail-panel">
      <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-muted)" }}>No encontrado</div>
    </div>
  );

  return (
    <div className="crm-detail-panel">
      <div className="crm-detail-header">
        <div>
          <div className="crm-detail-name">{lead.business_name}</div>
          <div style={{ marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <StagePill stage={lead.stage} />
            {lead.niche && <span className="tag" style={{ fontSize: 11 }}>{lead.niche}</span>}
            <ScoreDot score={lead.score || 0} />
          </div>
        </div>
        <button className="crm-close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Tabs */}
      <div className="crm-tabs">
        {[["info","Información"],["notes","Notas"],["activity","Actividad"]].map(([k,l]) => (
          <button key={k} className={`crm-tab${tab===k?" crm-tab--active":""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      <div className="crm-detail-body">
        {/* ── TAB INFO ── */}
        {tab === "info" && (
          <div>
            <div className="crm-section-title">Pipeline</div>
            <div className="crm-form-row">
              <div className="crm-form-group">
                <label>Etapa</label>
                <select value={field("stage", lead.stage)} onChange={(e) => setPatch({...patch, stage: e.target.value})}>
                  {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div className="crm-form-group">
                <label>Servicio de interés</label>
                <select value={field("service_interest", lead.service_interest)} onChange={(e) => setPatch({...patch, service_interest: e.target.value})}>
                  <option value="">— selecciona —</option>
                  {Object.entries(SERVICE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="crm-form-row">
              <div className="crm-form-group">
                <label>Valor del trato ($)</label>
                <input type="number" min="0" value={field("deal_value", lead.deal_value)} onChange={(e) => setPatch({...patch, deal_value: Number(e.target.value)})} />
              </div>
              <div className="crm-form-group">
                <label>Próximo seguimiento</label>
                <input type="date" value={field("next_followup_at", lead.next_followup_at?.slice(0,10))} onChange={(e) => setPatch({...patch, next_followup_at: e.target.value})} />
              </div>
            </div>
            <div className="crm-form-group" style={{ marginBottom: 12 }}>
              <label>Notas del trato</label>
              <textarea rows={3} value={field("deal_notes", lead.deal_notes)} onChange={(e) => setPatch({...patch, deal_notes: e.target.value})} placeholder="Observaciones, acuerdos, próximos pasos..." />
            </div>

            <div className="crm-section-title" style={{ marginTop: 20 }}>Contacto</div>
            <div className="crm-info-grid">
              <InfoRow icon="📞" label="Teléfono" value={lead.phone} />
              <InfoRow icon="📧" label="Email" value={lead.email} />
              <InfoRow icon="🌐" label="Web" value={lead.website} link />
              <InfoRow icon="📍" label="Ciudad" value={`${lead.city || ""}${lead.city && lead.state ? ", " : ""}${lead.state || ""}`} />
              <InfoRow icon="⭐" label="Calificación" value={lead.rating ? `${lead.rating} (${lead.reviews_count} reseñas)` : null} />
              <InfoRow icon="🗺️" label="Maps" value={lead.maps_url ? "Ver en Maps" : null} link href={lead.maps_url} />
            </div>

            <div className="crm-section-title" style={{ marginTop: 20 }}>Diagnóstico IA</div>
            {lead.diagnosis && <p className="crm-diagnosis">{lead.diagnosis}</p>}
            {lead.marketing_gaps && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 4 }}>Gaps detectados</div>
                <p className="crm-diagnosis">{lead.marketing_gaps}</p>
              </div>
            )}

            {Object.keys(patch).length > 0 && (
              <button className="btn" onClick={handleSave} disabled={saving} style={{ marginTop: 16, width: "100%" }}>
                {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar cambios"}
              </button>
            )}
          </div>
        )}

        {/* ── TAB NOTAS ── */}
        {tab === "notes" && (
          <div>
            <div className="crm-note-input-row">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Agrega una nota rápida..."
                rows={3}
                onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleAddNote(); }}
              />
              <button className="btn btn-sm" onClick={handleAddNote} disabled={addingNote || !newNote.trim()}>
                {addingNote ? "..." : "Agregar"}
              </button>
            </div>
            <div className="crm-notes-list">
              {(lead.notes || []).length === 0 && (
                <div style={{ color: "var(--color-text-muted)", textAlign: "center", padding: 24 }}>Sin notas</div>
              )}
              {(lead.notes || []).map((n) => (
                <div key={n.id} className="crm-note-item">
                  <p>{n.content}</p>
                  <span className="crm-note-date">{new Date(n.created_at).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB ACTIVIDAD ── */}
        {tab === "activity" && (
          <div className="crm-activity-list">
            {(lead.activities || []).length === 0 && (
              <div style={{ color: "var(--color-text-muted)", textAlign: "center", padding: 24 }}>Sin actividad</div>
            )}
            {(lead.activities || []).map((a) => (
              <div key={a.id} className="crm-activity-item">
                <span className="crm-activity-icon">{activityIcon(a.type)}</span>
                <div>
                  <div className="crm-activity-desc">{a.description}</div>
                  <div className="crm-activity-date">{new Date(a.created_at).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, link, href }) {
  if (!value) return null;
  return (
    <div className="crm-info-row">
      <span className="crm-info-icon">{icon}</span>
      <div>
        <div className="crm-info-label">{label}</div>
        {link
          ? <a href={href || value} target="_blank" rel="noreferrer" className="crm-info-link">{value}</a>
          : <div className="crm-info-value">{value}</div>
        }
      </div>
    </div>
  );
}

function activityIcon(type) {
  const map = {
    email_sent: "📧", call_made: "📞", note_added: "📝",
    stage_changed: "🔀", followup_sent: "📩", responded: "💬",
    deal_created: "🤝", created: "✨",
  };
  return map[type] || "•";
}

// ── Stats bar superior ────────────────────────────────────────────────────────
function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="crm-stats-bar">
      <StatChip label="Total leads" value={stats.total} color="#6366f1" />
      <StatChip label="Con email" value={stats.with_email} color="#0ea5e9" />
      <StatChip label="Clientes" value={stats.by_stage?.cliente || 0} color="#10b981" />
      <StatChip label="Revenue" value={`$${Number(stats.revenue || 0).toLocaleString()}`} color="#f59e0b" />
      <StatChip label="Propuestas" value={(stats.by_stage?.propuesta || 0) + (stats.by_stage?.negociacion || 0)} color="#f97316" />
    </div>
  );
}

function StatChip({ label, value, color }) {
  return (
    <div className="crm-stat-chip" style={{ borderTop: `3px solid ${color}` }}>
      <div className="crm-stat-value" style={{ color }}>{value ?? "—"}</div>
      <div className="crm-stat-label">{label}</div>
    </div>
  );
}

// ── Filtros ───────────────────────────────────────────────────────────────────
function FilterBar({ filters, onChange }) {
  return (
    <div className="crm-filter-bar">
      <input
        className="crm-search"
        placeholder="🔍 Buscar negocio, email, teléfono..."
        value={filters.q}
        onChange={(e) => onChange({ ...filters, q: e.target.value })}
      />
      <select value={filters.stage} onChange={(e) => onChange({ ...filters, stage: e.target.value })}>
        <option value="">Todas las etapas</option>
        {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
      <input
        placeholder="Nicho"
        value={filters.niche}
        onChange={(e) => onChange({ ...filters, niche: e.target.value })}
        style={{ maxWidth: 140 }}
      />
      <input
        placeholder="Ciudad"
        value={filters.city}
        onChange={(e) => onChange({ ...filters, city: e.target.value })}
        style={{ maxWidth: 140 }}
      />
    </div>
  );
}

// ── Kanban Board ──────────────────────────────────────────────────────────────
function KanbanBoard({ pipeline, onCardClick, onDrop }) {
  const [dragging, setDragging] = useState(null);
  const [overStage, setOverStage] = useState(null);

  return (
    <div className="crm-kanban">
      {STAGES.map((s) => {
        const cards = pipeline[s.key] || [];
        const isOver = overStage === s.key;
        return (
          <div
            key={s.key}
            className={`crm-column${isOver ? " crm-column--over" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOverStage(s.key); }}
            onDragLeave={() => setOverStage(null)}
            onDrop={(e) => {
              e.preventDefault();
              setOverStage(null);
              if (dragging && dragging.stage !== s.key) onDrop(dragging.id, s.key);
              setDragging(null);
            }}
          >
            <div className="crm-column-header" style={{ borderBottom: `3px solid ${s.color}` }}>
              <span className="crm-column-label" style={{ color: s.color }}>{s.label}</span>
              <span className="crm-column-count" style={{ background: s.bg, color: s.color }}>{cards.length}</span>
            </div>
            <div className="crm-column-body">
              {cards.length === 0 && (
                <div className="crm-column-empty">Sin leads</div>
              )}
              {cards.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDragging({ id: lead.id, stage: s.key })}
                  onDragEnd={() => setDragging(null)}
                >
                  <KanbanCard lead={lead} onClick={onCardClick} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function CrmPage() {
  const [pipeline, setPipeline] = useState({});
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("kanban"); // kanban | list
  const [filters, setFilters] = useState({ q: "", stage: "", niche: "", city: "" });
  const [listLeads, setListLeads] = useState([]);
  const [listLoading, setListLoading] = useState(false);

  const loadPipeline = useCallback(() => {
    crmFetch("/pipeline")
      .then((d) => { setPipeline(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const loadStats = useCallback(() => {
    crmFetch("/stats").then(setStats).catch(() => {});
  }, []);

  useEffect(() => { loadPipeline(); loadStats(); }, [loadPipeline, loadStats]);

  // Carga la lista cuando cambian los filtros en vista lista
  useEffect(() => {
    if (view !== "list") return;
    setListLoading(true);
    const params = new URLSearchParams({ limit: "100" });
    if (filters.q) params.set("q", filters.q);
    if (filters.stage) params.set("stage", filters.stage);
    if (filters.niche) params.set("niche", filters.niche);
    if (filters.city) params.set("city", filters.city);
    crmFetch(`/leads?${params}`)
      .then((d) => { setListLeads(d.leads); setListLoading(false); })
      .catch(() => setListLoading(false));
  }, [view, filters]);

  async function handleDrop(leadId, newStage) {
    try {
      await crmFetch(`/leads/${leadId}`, { method: "PATCH", body: JSON.stringify({ stage: newStage }) });
      loadPipeline();
      loadStats();
    } catch (e) { alert(e.message); }
  }

  return (
    <div className="page crm-page">
      {/* HEADER */}
      <div className="page-header crm-page-header">
        <div>
          <h1 className="page-title">CRM · Pipeline de ventas</h1>
          <p className="page-sub">Agencia Shop Services — gestión de leads y seguimiento comercial</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className={`btn btn-sm${view === "kanban" ? "" : " btn-outline"}`} onClick={() => setView("kanban")}>
            ▦ Kanban
          </button>
          <button className={`btn btn-sm${view === "list" ? "" : " btn-outline"}`} onClick={() => setView("list")}>
            ☰ Lista
          </button>
        </div>
      </div>

      {error && <div className="banner banner-danger">{error}</div>}

      <StatsBar stats={stats} />

      {/* FILTROS */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* CONTENIDO PRINCIPAL */}
      <div className={`crm-workspace${selectedLead ? " crm-workspace--split" : ""}`}>
        <div className="crm-main-area">
          {loading ? (
            <div style={{ textAlign: "center", padding: 64, color: "var(--color-text-muted)" }}>
              <div className="agent-spinner" style={{ margin: "0 auto 16px" }} />
              Cargando pipeline...
            </div>
          ) : view === "kanban" ? (
            <KanbanBoard
              pipeline={pipeline}
              onCardClick={(lead) => setSelectedLead(lead.id)}
              onDrop={handleDrop}
            />
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                {listLoading ? (
                  <div style={{ textAlign: "center", padding: 32, color: "var(--color-text-muted)" }}>Cargando...</div>
                ) : (
                  <table className="leads-table">
                    <thead>
                      <tr>
                        <th>Negocio</th>
                        <th>Nicho</th>
                        <th>Ciudad</th>
                        <th>Email</th>
                        <th>Teléfono</th>
                        <th>Etapa</th>
                        <th>Score</th>
                        <th>Trato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listLeads.length === 0 && (
                        <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: "var(--color-text-muted)" }}>Sin resultados</td></tr>
                      )}
                      {listLeads.map((l) => (
                        <tr key={l.id} style={{ cursor: "pointer" }} onClick={() => setSelectedLead(l.id)}>
                          <td style={{ fontWeight: 600 }}>{l.business_name}</td>
                          <td><span className="tag" style={{ fontSize: 11 }}>{l.niche}</span></td>
                          <td style={{ color: "var(--color-text-muted)", fontSize: 13 }}>{l.city}</td>
                          <td style={{ fontSize: 12 }}>{l.email || "—"}</td>
                          <td style={{ fontSize: 12 }}>{l.phone || "—"}</td>
                          <td><StagePill stage={l.stage} /></td>
                          <td><ScoreDot score={l.score || 0} /></td>
                          <td style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>
                            {l.deal_value > 0 ? `$${Number(l.deal_value).toLocaleString()}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedLead && (
          <LeadDetailPanel
            leadId={selectedLead}
            onClose={() => setSelectedLead(null)}
            onSaved={() => { loadPipeline(); loadStats(); }}
          />
        )}
      </div>
    </div>
  );
}
