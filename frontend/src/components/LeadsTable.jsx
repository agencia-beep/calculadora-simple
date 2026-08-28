import { useState } from "react";
import {
  CONTACT_STATUS_OPTIONS,
  PRIORITY_BADGE,
  WEBSITE_STATUS_BADGE,
  WEBSITE_STATUS_LABELS,
  scoreColor,
} from "../constants";
import Icon from "./Icon";

const URGENCY_COLOR = { alta: "#ef4444", media: "#f59e0b", baja: "#6b7280" };
const URGENCY_LABEL = { alta: "Urgente", media: "Importante", baja: "Opcional" };

function LeadRow({ lead, onContactStatusChange, onOpenLead, onDelete }) {
  const [open, setOpen] = useState(false);

  let gaps = [];
  try { gaps = lead.marketing_gaps ? JSON.parse(lead.marketing_gaps) : []; } catch {}

  const priorityColor = { Alta: "#ef4444", Media: "#f59e0b", Baja: "#6b7280" };
  const color = priorityColor[lead.priority] || "#6b7280";

  return (
    <div
      className={lead.is_new ? "lead-card lead-card-new" : "lead-card"}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      {/* Fila compacta siempre visible */}
      <div
        className="lead-card-header"
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen((v) => !v)}
      >
        <div className="lead-card-main">
          <span className="lead-card-name">{lead.business_name}</span>
          <span className="lead-card-meta">
            <span className="lead-card-niche">{lead.niche}</span>
            <span className="lead-card-sep">·</span>
            <span>{lead.city}{lead.state ? `, ${lead.state}` : ""}</span>
          </span>
        </div>

        <div className="lead-card-badges">
          {lead.website_status && lead.website_status !== "no_prospecto" && (
            <span className={`badge ${WEBSITE_STATUS_BADGE[lead.website_status] || "badge-muted"}`} style={{ fontSize: 11 }}>
              {WEBSITE_STATUS_LABELS[lead.website_status]}
            </span>
          )}
          {lead.priority && (
            <span style={{ fontSize: 12, fontWeight: 700, color }}>
              {lead.score}pts
            </span>
          )}
          {gaps.length > 0 && (
            <span title={`${gaps.length} carencias detectadas`} style={{ fontSize: 11, fontWeight: 600, color: "#7c3aed" }}>
              {gaps.length} oport.
            </span>
          )}
          <Icon
            name="externalLink"
            size={13}
            style={{ color: "var(--color-text-muted)", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}
          />
        </div>
      </div>

      {/* Panel expandido */}
      {open && (
        <div className="lead-card-body">
          {/* Info de contacto */}
          <div className="lead-card-grid">
            <div className="lead-card-field">
              <span className="lc-label"><Icon name="phone" size={12} /> Teléfono</span>
              <span>{lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : "—"}</span>
            </div>
            <div className="lead-card-field">
              <span className="lc-label"><Icon name="mail" size={12} /> Email</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: "100%" }}>
                {lead.email ? <a href={`mailto:${lead.email}`} title={lead.email}>{lead.email}</a> : "—"}
              </span>
            </div>
            <div className="lead-card-field">
              <span className="lc-label"><Icon name="externalLink" size={12} /> Website</span>
              <span>
                {lead.website
                  ? <a href={lead.website} target="_blank" rel="noreferrer" title={lead.website} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block", maxWidth: "100%" }}>
                      {(() => { try { return new URL(lead.website).hostname.replace(/^www\./, ""); } catch { return lead.website; } })()}
                    </a>
                  : "—"}
              </span>
            </div>
            <div className="lead-card-field">
              <span className="lc-label"><Icon name="star" size={12} /> Rating</span>
              <span>{lead.rating ?? "—"} ★ ({lead.reviews_count ?? 0} reseñas)</span>
            </div>
            {lead.owner_name && (
              <div className="lead-card-field">
                <span className="lc-label"><Icon name="user" size={12} /> Dueño</span>
                <span style={{ fontWeight: 500 }}>{lead.owner_name}</span>
              </div>
            )}
            {lead.maps_url && (
              <div className="lead-card-field">
                <span className="lc-label"><Icon name="mapPin" size={12} /> Dirección</span>
                <a href={lead.maps_url} target="_blank" rel="noreferrer">{lead.address || "Ver en Maps"}</a>
              </div>
            )}
          </div>

          {/* Redes sociales */}
          {(lead.linkedin_url || lead.facebook_url || lead.instagram_url) && (
            <div className="lead-card-socials">
              {lead.linkedin_url && (
                <a href={lead.linkedin_url} target="_blank" rel="noreferrer" className="social-link linkedin">
                  <Icon name="linkedin" size={13} /> LinkedIn
                </a>
              )}
              {lead.facebook_url && (
                <a href={lead.facebook_url} target="_blank" rel="noreferrer" className="social-link facebook">
                  <Icon name="facebook" size={13} /> Facebook
                </a>
              )}
              {lead.instagram_url && (
                <a href={lead.instagram_url} target="_blank" rel="noreferrer" className="social-link instagram">
                  <Icon name="instagram" size={13} /> Instagram
                </a>
              )}
            </div>
          )}

          {/* SEO */}
          {lead.seo_notes && (
            <div className="lead-card-seo">
              <span className="lc-label">SEO / Web</span>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                {lead.page_speed_ms != null ? `${lead.page_speed_ms}ms · ` : ""}
                {lead.seo_notes}
                {lead.detected_language && !lead.detected_language.startsWith("es") && (
                  <span style={{ marginLeft: 8, padding: "1px 6px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontSize: 11 }}>
                    Web en {lead.detected_language.toUpperCase()}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Carencias de marketing */}
          {gaps.length > 0 && (
            <div className="lead-card-gaps">
              <span className="lc-label" style={{ marginBottom: 6 }}>Oportunidades detectadas</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {gaps.map((g) => (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "5px 8px", borderRadius: 6, background: "var(--color-bg)", borderLeft: `2px solid ${URGENCY_COLOR[g.urgency]}` }}>
                    <span style={{ flex: 1 }}>{g.label} <span style={{ color: "var(--color-text-muted)" }}>→ {g.service}</span></span>
                    <span style={{ fontWeight: 600, color: URGENCY_COLOR[g.urgency], fontSize: 10 }}>{URGENCY_LABEL[g.urgency]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="lead-card-actions">
            <select
              className="contact-select"
              value={lead.contact_status}
              onChange={(e) => { e.stopPropagation(); onContactStatusChange(lead.id, e.target.value); }}
              onClick={(e) => e.stopPropagation()}
            >
              {CONTACT_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <button className="btn btn-secondary btn-small" onClick={(e) => { e.stopPropagation(); onOpenLead(lead); }}>
              <Icon name="messageSquare" size={14} /> Mensajes y notas
            </button>
            <button
              className="btn btn-secondary btn-small btn-icon"
              onClick={(e) => { e.stopPropagation(); onDelete(lead.id); }}
              title="Eliminar"
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LeadsTable({ leads, onContactStatusChange, onOpenLead, onDelete }) {
  if (leads.length === 0) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
        No hay leads todavia. Usa el formulario de busqueda para encontrar negocios locales.
      </div>
    );
  }

  return (
    <div className="lead-list">
      {leads.map((lead) => (
        <LeadRow
          key={lead.id}
          lead={lead}
          onContactStatusChange={onContactStatusChange}
          onOpenLead={onOpenLead}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
