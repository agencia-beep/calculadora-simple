import {
  CONTACT_STATUS_OPTIONS,
  PRIORITY_BADGE,
  WEBSITE_STATUS_BADGE,
  WEBSITE_STATUS_LABELS,
  scoreColor,
} from "../constants";
import Icon from "./Icon";

export default function LeadsTable({ leads, onContactStatusChange, onOpenLead, onDelete }) {
  if (leads.length === 0) {
    return (
      <div className="card empty-state">
        <p>No hay leads todavia. Usa el formulario de busqueda para encontrar negocios locales.</p>
      </div>
    );
  }

  return (
    <div className="card table-scroll">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Nicho</th>
            <th>Ciudad</th>
            <th>Telefono</th>
            <th>Email</th>
            <th>Website</th>
            <th>SEO / Velocidad</th>
            <th>Rating</th>
            <th>Reviews</th>
            <th>Score</th>
            <th>Prioridad</th>
            <th>Diagnostico</th>
            <th>Estado contacto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className={lead.is_new ? "lead-row-new" : ""}>
              <td>
                <strong>{lead.business_name}</strong>
                {lead.maps_url && (
                  <>
                    {" "}
                    <a
                      href={lead.maps_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Ver en Google Maps"
                      style={{ display: "inline-flex", verticalAlign: "middle", color: "var(--color-text-muted)" }}
                    >
                      <Icon name="mapPin" size={14} />
                    </a>
                  </>
                )}
              </td>
              <td>{lead.niche}</td>
              <td>{lead.city}</td>
              <td>{lead.phone || "—"}</td>
              <td>{lead.email || "—"}</td>
              <td>
                <span className={`badge ${WEBSITE_STATUS_BADGE[lead.website_status] || "badge-muted"}`}>
                  {WEBSITE_STATUS_LABELS[lead.website_status] || "—"}
                </span>
                {lead.website && lead.website_status === "tiene_website" && (
                  <>
                    {" "}
                    <a href={lead.website} target="_blank" rel="noreferrer">
                      ver
                    </a>
                  </>
                )}
              </td>
              <td style={{ maxWidth: 200, whiteSpace: "normal", fontSize: 12 }}>
                {lead.page_speed_ms != null ? `${lead.page_speed_ms} ms` : "—"}
                {lead.seo_notes && <div style={{ color: "var(--color-text-muted)" }}>{lead.seo_notes}</div>}
              </td>
              <td>{lead.rating ?? "—"}</td>
              <td>{lead.reviews_count ?? 0}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, color: scoreColor(lead.score) }}>{lead.score}</span>
                  <div className="score-bar-track">
                    <div
                      className="score-bar-fill"
                      style={{ width: `${lead.score}%`, background: scoreColor(lead.score) }}
                    />
                  </div>
                </div>
              </td>
              <td>
                <span className={`badge ${PRIORITY_BADGE[lead.priority] || "badge-muted"}`}>
                  {lead.priority || "—"}
                </span>
              </td>
              <td style={{ maxWidth: 260, whiteSpace: "normal" }}>{lead.diagnosis || "—"}</td>
              <td>
                <select
                  className="contact-select"
                  value={lead.contact_status}
                  onChange={(e) => onContactStatusChange(lead.id, e.target.value)}
                >
                  {CONTACT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-secondary btn-small" onClick={() => onOpenLead(lead)}>
                    <Icon name="messageSquare" size={14} /> Mensajes
                  </button>
                  <button
                    className="btn btn-secondary btn-small btn-icon"
                    onClick={() => onDelete(lead.id)}
                    title="Eliminar"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
