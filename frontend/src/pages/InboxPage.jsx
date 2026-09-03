import { useState, useEffect, useCallback } from "react";

const CRM_URL = "https://leadfinder-crm.agenciashopservices.workers.dev";
const CRM_SECRET = "crm2025secret";

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

const STAGE_COLORS = {
  nuevo: "#6366f1", contactado: "#0ea5e9", respondio: "#8b5cf6",
  propuesta: "#f59e0b", negociacion: "#f97316", cliente: "#10b981",
  sin_interes: "#94a3b8", reimpactar: "#ec4899",
};

const STAGE_LABELS = {
  nuevo: "Nuevo", contactado: "Contactado", respondio: "Respondió",
  propuesta: "Propuesta", negociacion: "Negociación", cliente: "Cliente",
  sin_interes: "Sin interés", reimpactar: "Reimpactar",
};

const ACTIVITY_ICONS = {
  email_sent: "📧", followup_sent: "📩", call_initiated: "📲",
  call_completed: "✅", note_added: "📝", stage_changed: "🔀",
  responded: "💬", created: "✨",
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString("es", { month: "short", day: "numeric" });
}

function ConversationItem({ conv, selected, onClick }) {
  const stageColor = STAGE_COLORS[conv.stage] || "#64748b";
  const icon = ACTIVITY_ICONS[conv.last_activity_type] || "•";
  const isUnread = conv.stage === "respondio";

  return (
    <div
      className={`inbox-conv-item${selected ? " inbox-conv-item--active" : ""}${isUnread ? " inbox-conv-item--unread" : ""}`}
      onClick={() => onClick(conv)}
    >
      <div className="inbox-conv-avatar" style={{ background: stageColor }}>
        {(conv.business_name || "?")[0].toUpperCase()}
      </div>
      <div className="inbox-conv-body">
        <div className="inbox-conv-top">
          <span className="inbox-conv-name">{conv.business_name}</span>
          <span className="inbox-conv-time">{timeAgo(conv.last_activity_at)}</span>
        </div>
        <div className="inbox-conv-preview">
          <span style={{ marginRight: 4 }}>{icon}</span>
          <span>{conv.last_activity_desc?.slice(0, 60) || "Sin actividad"}</span>
        </div>
        <div className="inbox-conv-meta">
          <span className="inbox-stage-pill" style={{ background: stageColor + "22", color: stageColor }}>
            {STAGE_LABELS[conv.stage] || conv.stage}
          </span>
          {conv.city && <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{conv.city}</span>}
        </div>
      </div>
      {isUnread && <div className="inbox-unread-dot" />}
    </div>
  );
}

function ThreadPanel({ leadId, onClose }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    if (!leadId) return;
    setLoading(true);
    crmFetch(`/leads/${leadId}`)
      .then((d) => { setLead(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [leadId]);

  useEffect(() => { reload(); }, [reload]);

  async function handleNote() {
    if (!newNote.trim()) return;
    setSaving(true);
    try {
      await crmFetch(`/leads/${leadId}/notes`, { method: "POST", body: JSON.stringify({ content: newNote.trim() }) });
      setNewNote("");
      reload();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  }

  if (!leadId) return (
    <div className="inbox-thread inbox-thread--empty">
      <div style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
        <div>Selecciona una conversación</div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="inbox-thread inbox-thread--empty">
      <div style={{ color: "var(--color-text-muted)" }}>Cargando...</div>
    </div>
  );

  if (!lead) return null;

  const stageColor = STAGE_COLORS[lead.stage] || "#64748b";

  // Combinar actividades y notas en un solo hilo cronológico
  const thread = [
    ...(lead.activities || []).map((a) => ({ ...a, _type: "activity" })),
    ...(lead.notes || []).map((n) => ({ ...n, _type: "note", type: "note_added", description: n.content })),
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="inbox-thread">
      {/* Header */}
      <div className="inbox-thread-header">
        <div className="inbox-thread-avatar" style={{ background: stageColor }}>
          {(lead.business_name || "?")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <div className="inbox-thread-name">{lead.business_name}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
            <span className="inbox-stage-pill" style={{ background: stageColor + "22", color: stageColor }}>
              {STAGE_LABELS[lead.stage] || lead.stage}
            </span>
            {lead.phone && <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>📞 {lead.phone}</span>}
            {lead.email && <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>📧 {lead.email}</span>}
          </div>
        </div>
        <button className="crm-close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Hilo de mensajes */}
      <div className="inbox-thread-body">
        {thread.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 32 }}>Sin actividad</div>
        )}
        {thread.map((item, i) => (
          <div key={item.id || i} className={`inbox-msg inbox-msg--${item._type}`}>
            <div className="inbox-msg-icon">{ACTIVITY_ICONS[item.type] || "•"}</div>
            <div className="inbox-msg-content">
              <div className="inbox-msg-text">{item.description}</div>
              <div className="inbox-msg-time">
                {new Date(item.created_at).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input de nota */}
      <div className="inbox-reply-box">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Agrega una nota o comentario..."
          rows={2}
          onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleNote(); }}
        />
        <button className="btn btn-sm" onClick={handleNote} disabled={saving || !newNote.trim()}>
          {saving ? "..." : "Agregar nota"}
        </button>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const loadConversations = useCallback(() => {
    setLoading(true);
    crmFetch(`/inbox?filter=${filter}&limit=100`)
      .then((d) => { setConversations(d.conversations || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const filtered = conversations.filter((c) =>
    !search || c.business_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  );

  const filters = [
    { key: "all", label: "Todos" },
    { key: "responded", label: "Respondieron" },
    { key: "email", label: "Emails" },
    { key: "call", label: "Llamadas" },
  ];

  return (
    <div className="inbox-page">
      {/* Panel izquierdo — lista de conversaciones */}
      <div className="inbox-sidebar">
        <div className="inbox-sidebar-header">
          <h2 className="inbox-title">Bandeja de entrada</h2>
          <button className="btn btn-sm" onClick={loadConversations} title="Actualizar">↺</button>
        </div>

        <input
          className="inbox-search"
          placeholder="Buscar negocio o ciudad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="inbox-filters">
          {filters.map((f) => (
            <button
              key={f.key}
              className={`inbox-filter-btn${filter === f.key ? " inbox-filter-btn--active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="inbox-conv-list">
          {loading && <div style={{ textAlign: "center", padding: 32, color: "var(--color-text-muted)" }}>Cargando...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 32, color: "var(--color-text-muted)" }}>Sin conversaciones</div>
          )}
          {filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              selected={selected?.id === conv.id}
              onClick={setSelected}
            />
          ))}
        </div>
      </div>

      {/* Panel derecho — hilo de conversación */}
      <ThreadPanel
        leadId={selected?.id}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
