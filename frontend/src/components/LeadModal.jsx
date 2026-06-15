import { useState } from "react";
import { generateMessages } from "../api";

export default function LeadModal({ lead, onClose, onUpdated }) {
  const [current, setCurrent] = useState(lead);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const updated = await generateMessages(current.id);
      setCurrent(updated);
      onUpdated(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text) {
    if (text) navigator.clipboard?.writeText(text);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{current.business_name}</h3>
        <p style={{ color: "var(--color-text-muted)", marginTop: -8, fontSize: 13 }}>
          {current.niche} · {current.city} · Score {current.score} ({current.priority})
        </p>

        {error && <div className="banner banner-danger">{error}</div>}

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

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          <button className="btn" onClick={handleGenerate} disabled={loading}>
            {loading ? "Generando..." : "Generar mensajes"}
          </button>
        </div>
      </div>
    </div>
  );
}
