import { useEffect, useState } from "react";
import {
  createLeadNote,
  deleteLeadNote,
  generateDemo,
  generateMessages,
  getLeadActivity,
  getLeadNotes,
  updateFollowUp,
} from "../api";
import Icon from "./Icon";

const DEMO_PUBLIC_BASE_URL = "https://agencia-beep.github.io/calculadora-simple";

const ACTIVITY_ICON = {
  created: "zap",
  status_change: "trendingUp",
  note_added: "messageSquare",
  follow_up_set: "calendar",
  demo_generated: "externalLink",
  messages_generated: "mail",
};

function formatDate(iso) {
  return new Date(iso).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" });
}

export default function LeadModal({ lead, onClose, onUpdated }) {
  const [current, setCurrent] = useState(lead);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState("");

  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState("");
  const [activity, setActivity] = useState([]);
  const [followUpDate, setFollowUpDate] = useState(
    current.next_follow_up ? current.next_follow_up.slice(0, 10) : ""
  );
  const [tab, setTab] = useState("mensajes");

  useEffect(() => {
    getLeadNotes(current.id).then(setNotes).catch(() => setNotes([]));
    getLeadActivity(current.id).then(setActivity).catch(() => setActivity([]));
  }, [current.id]);

  async function handleAddNote() {
    if (!noteText.trim()) return;
    try {
      const note = await createLeadNote(current.id, noteText.trim());
      setNotes((prev) => [note, ...prev]);
      setNoteText("");
      getLeadActivity(current.id).then(setActivity).catch(() => {});
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteNote(noteId) {
    try {
      await deleteLeadNote(current.id, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleFollowUpChange(value) {
    setFollowUpDate(value);
    try {
      const iso = value ? new Date(value + "T09:00:00").toISOString() : null;
      const updated = await updateFollowUp(current.id, iso);
      setCurrent(updated);
      onUpdated(updated);
      getLeadActivity(current.id).then(setActivity).catch(() => {});
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const updated = await generateMessages(current.id);
      setCurrent(updated);
      onUpdated(updated);
      getLeadActivity(current.id).then(setActivity).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateDemo() {
    setDemoLoading(true);
    setError("");
    try {
      const result = await generateDemo(current.id);
      const updated = { ...current, demo_slug: result.slug };
      setCurrent(updated);
      onUpdated(updated);
      getLeadActivity(current.id).then(setActivity).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setDemoLoading(false);
    }
  }

  function copyToClipboard(text) {
    if (text) navigator.clipboard?.writeText(text);
  }

  const TABS = [
    { key: "mensajes", label: "Mensajes" },
    { key: "seguimiento", label: "Seguimiento" },
    { key: "notas", label: `Notas${notes.length ? ` (${notes.length})` : ""}` },
    { key: "historial", label: "Historial" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {current.business_name}
          {current.detected_language && !current.detected_language.startsWith("es") && (
            <span title={`Sitio web en: ${current.detected_language}`} style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "#fef3c7", color: "#92400e", border: "1px solid #fbbf24" }}>
              🌐 Web en {current.detected_language.toUpperCase()}
            </span>
          )}
        </h3>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8, fontSize: 13 }}>
          {current.niche} · {current.city} · Score {current.score} ({current.priority})
        </p>

        {error && <div className="banner banner-danger">{error}</div>}

        <div className="lead-info-grid">
          <div className="lead-info-item">
            <Icon name="phone" size={14} />
            {current.phone ? <a href={`tel:${current.phone}`}>{current.phone}</a> : <span>—</span>}
          </div>
          <div className="lead-info-item">
            <Icon name="mail" size={14} />
            {current.email ? <a href={`mailto:${current.email}`}>{current.email}</a> : <span>—</span>}
          </div>
          <div className="lead-info-item">
            <Icon name="mapPin" size={14} />
            <span>{current.address || "—"}</span>
          </div>
          <div className="lead-info-item">
            <Icon name="externalLink" size={14} />
            {current.website ? (
              <a href={current.website} target="_blank" rel="noreferrer">{current.website}</a>
            ) : (
              <span>Sin website</span>
            )}
          </div>
          <div className="lead-info-item">
            <Icon name="star" size={14} />
            <span>{current.rating ?? "—"} ★ ({current.reviews_count ?? 0} reseñas)</span>
          </div>
          {current.maps_url && (
            <div className="lead-info-item">
              <Icon name="mapPin" size={14} />
              <a href={current.maps_url} target="_blank" rel="noreferrer">Ver en Google Maps</a>
            </div>
          )}
          {current.owner_name && (
            <div className="lead-info-item">
              <Icon name="user" size={14} />
              <span style={{ fontWeight: 500 }}>{current.owner_name}</span>
            </div>
          )}
          {(current.linkedin_url || current.facebook_url || current.instagram_url) && (
            <div className="lead-info-item" style={{ gap: 10 }}>
              <Icon name="externalLink" size={14} />
              {current.linkedin_url && (
                <a href={current.linkedin_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#0077b5" }}>
                  <Icon name="linkedin" size={15} /> LinkedIn
                </a>
              )}
              {current.facebook_url && (
                <a href={current.facebook_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#1877f2" }}>
                  <Icon name="facebook" size={15} /> Facebook
                </a>
              )}
              {current.instagram_url && (
                <a href={current.instagram_url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#e1306c" }}>
                  <Icon name="instagram" size={15} /> Instagram
                </a>
              )}
            </div>
          )}
        </div>

        <div className="modal-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`modal-tab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "mensajes" && (
          <>
            {current.marketing_gaps && (() => {
              let gaps = [];
              try { gaps = JSON.parse(current.marketing_gaps); } catch {}
              if (!gaps.length) return null;
              const URGENCY_COLOR = { alta: "#ef4444", media: "#f59e0b", baja: "#6b7280" };
              const URGENCY_LABEL = { alta: "Urgente", media: "Importante", baja: "Opcional" };
              return (
                <div className="modal-section" style={{ paddingBottom: 0 }}>
                  <h4 style={{ marginBottom: 10 }}>Oportunidades de marketing detectadas</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                    {gaps.map((g) => (
                      <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "var(--color-muted-bg)", borderLeft: `3px solid ${URGENCY_COLOR[g.urgency] || "#6b7280"}` }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{g.label}</span>
                          <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: 8 }}>→ {g.service}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: URGENCY_COLOR[g.urgency], whiteSpace: "nowrap" }}>
                          {URGENCY_LABEL[g.urgency]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div className="modal-section">
              <h4>Diagnostico breve</h4>
              <pre>{current.diagnosis || "Genera los mensajes para crear un diagnostico."}</pre>
            </div>

            <div className="modal-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0 }}>Mensaje de WhatsApp</h4>
                {current.whatsapp_message && (
                  <button className="btn btn-secondary btn-small" onClick={() => copyToClipboard(current.whatsapp_message)}>
                    Copiar
                  </button>
                )}
              </div>
              <pre>{current.whatsapp_message || "—"}</pre>
            </div>

            <div className="modal-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0 }}>Email frio</h4>
                {current.email_message && (
                  <button className="btn btn-secondary btn-small" onClick={() => copyToClipboard(current.email_message)}>
                    Copiar
                  </button>
                )}
              </div>
              <pre>{current.email_message || "—"}</pre>
            </div>

            <div className="modal-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0 }}>Guion de llamada</h4>
                {current.call_script && (
                  <button className="btn btn-secondary btn-small" onClick={() => copyToClipboard(current.call_script)}>
                    Copiar
                  </button>
                )}
              </div>
              <pre>{current.call_script || "—"}</pre>
            </div>

            <div className="modal-section">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ margin: 0 }}>Demo de pagina web</h4>
                {current.demo_slug && (
                  <a
                    className="btn btn-secondary btn-small"
                    href={`${DEMO_PUBLIC_BASE_URL}/demos/${current.demo_slug}/index.html`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver demo
                  </a>
                )}
              </div>
              <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 8 }}>
                {current.demo_slug
                  ? "Demo publicada. Comparte este link con el cliente:"
                  : "Genera una pagina web demo de ejemplo para este negocio (util si no tiene website)."}
              </p>
              {current.demo_slug && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <input
                    readOnly
                    value={`${DEMO_PUBLIC_BASE_URL}/demos/${current.demo_slug}/index.html`}
                    onClick={(e) => e.target.select()}
                    style={{ flex: 1, fontSize: 12, padding: "6px 8px" }}
                  />
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={() => copyToClipboard(`${DEMO_PUBLIC_BASE_URL}/demos/${current.demo_slug}/index.html`)}
                  >
                    Copiar
                  </button>
                </div>
              )}
              <button className="btn btn-secondary btn-small" onClick={handleGenerateDemo} disabled={demoLoading}>
                {demoLoading ? "Generando y publicando..." : current.demo_slug ? "Regenerar demo" : "Generar demo"}
              </button>
              {demoLoading && (
                <p style={{ color: "var(--color-text-muted)", fontSize: 12, marginTop: 6 }}>
                  Esto publica el cambio en GitHub Pages, puede tardar 1-2 minutos en verse reflejado.
                </p>
              )}
            </div>
          </>
        )}

        {tab === "seguimiento" && (
          <div className="modal-section">
            <h4>Proxima fecha de seguimiento</h4>
            <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 10 }}>
              Programa cuando volver a contactar a este lead. Se resaltara en el pipeline si la fecha ya paso.
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => handleFollowUpChange(e.target.value)}
                style={{ padding: "8px 10px" }}
              />
              {followUpDate && (
                <button className="btn btn-secondary btn-small" onClick={() => handleFollowUpChange("")}>
                  <Icon name="x" size={13} /> Quitar
                </button>
              )}
            </div>
          </div>
        )}

        {tab === "notas" && (
          <div className="modal-section">
            <h4>Agregar nota</h4>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ej: Hable con el dueno, le interesa pero quiere ver precios la otra semana..."
              style={{ width: "100%", minHeight: 70, padding: 10, borderRadius: 8, border: "1px solid var(--color-border)", fontFamily: "inherit", fontSize: 13, resize: "vertical" }}
            />
            <button className="btn btn-secondary btn-small" style={{ marginTop: 8 }} onClick={handleAddNote} disabled={!noteText.trim()}>
              Guardar nota
            </button>

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {notes.length === 0 && <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Sin notas todavia.</p>}
              {notes.map((n) => (
                <div key={n.id} style={{ background: "var(--color-muted-bg)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{formatDate(n.created_at)}</span>
                    <button
                      onClick={() => handleDeleteNote(n.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "inline-flex" }}
                      title="Eliminar nota"
                    >
                      <Icon name="trash" size={13} />
                    </button>
                  </div>
                  <p style={{ fontSize: 13, marginTop: 4, whiteSpace: "pre-wrap" }}>{n.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "historial" && (
          <div className="modal-section">
            <h4>Linea de tiempo</h4>
            {activity.length === 0 && <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Sin actividad registrada.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
              {activity.map((a) => (
                <div key={a.id} style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-muted-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--color-primary)" }}>
                    <Icon name={ACTIVITY_ICON[a.activity_type] || "check"} size={14} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13 }}>{a.description}</p>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{formatDate(a.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          {tab === "mensajes" && (
            <button className="btn" onClick={handleGenerate} disabled={loading}>
              {loading ? "Generando..." : "Generar mensajes"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
