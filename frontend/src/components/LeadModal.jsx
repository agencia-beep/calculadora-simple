import { useState } from "react";
import { generateDemo, generateMessages } from "../api";

const DEMO_PUBLIC_BASE_URL = "https://agencia-beep.github.io/calculadora-simple";

export default function LeadModal({ lead, onClose, onUpdated }) {
  const [current, setCurrent] = useState(lead);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
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

  async function handleGenerateDemo() {
    setDemoLoading(true);
    setError("");
    try {
      const result = await generateDemo(current.id);
      const updated = { ...current, demo_slug: result.slug };
      setCurrent(updated);
      onUpdated(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setDemoLoading(false);
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
