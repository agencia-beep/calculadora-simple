import { useState, useEffect, useCallback } from "react";
import { getClientToken } from "../api";

const AGENT_URL = "https://leadfinder-agent.agenciashopservices.workers.dev";
const AGENT_SECRET = "finder2025agent";

function agentFetch(path, options = {}) {
  return fetch(`${AGENT_URL}${path}`, {
    ...options,
    headers: { "x-agent-secret": AGENT_SECRET, "Content-Type": "application/json", ...(options.headers || {}) },
  }).then((r) => r.json());
}

function StatusPill({ active }) {
  return (
    <span className={`agent-pill ${active ? "agent-pill--active" : "agent-pill--idle"}`}>
      <span className="agent-pill-dot" />
      {active ? "Activo" : "Ejecutando..."}
    </span>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div className={`agent-kpi agent-kpi--${color}`}>
      <div className="agent-kpi-label">{label}</div>
      <div className="agent-kpi-value">{value ?? "—"}</div>
      {sub && <div className="agent-kpi-sub">{sub}</div>}
    </div>
  );
}

function EmailPreviewModal({ lead, onClose }) {
  const [state, setState] = useState("loading");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    agentFetch(`/preview/${lead.id}`)
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setState("ready");
      })
      .catch((e) => {
        setErr(e.message);
        setState("error");
      });
  }, [lead.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box agent-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Vista previa del email</div>
            <div className="modal-sub">{lead.business_name} · {lead.email}</div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {state === "loading" && (
          <div className="agent-preview-loading">
            <div className="agent-spinner" />
            Generando email con Claude Haiku...
          </div>
        )}

        {state === "error" && (
          <div className="banner banner-danger">{err}</div>
        )}

        {state === "ready" && data && (
          <div className="agent-preview-body">
            <div className="agent-preview-field">
              <span className="agent-preview-label">Para</span>
              <span className="agent-preview-val">{data.email}</span>
            </div>
            <div className="agent-preview-field">
              <span className="agent-preview-label">Asunto</span>
              <span className="agent-preview-val agent-preview-subject">{data.subject}</span>
            </div>
            <div className="agent-preview-content">{data.body}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentPage() {
  const [stats, setStats] = useState(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [agentContext, setAgentContext] = useState("");
  const [contextSaving, setContextSaving] = useState(false);
  const [contextSaved, setContextSaved] = useState(false);

  const loadStats = useCallback(() => {
    agentFetch("/stats")
      .then(setStats)
      .catch(() => setError("No se pudo conectar con el agente."));
  }, []);

  useEffect(() => {
    loadStats();
    agentFetch("/config").then((d) => setAgentContext(d.agent_context ?? "")).catch(() => {});
  }, [loadStats]);

  async function handleSaveContext() {
    setContextSaving(true);
    setContextSaved(false);
    try {
      await agentFetch("/config", { method: "PUT", body: JSON.stringify({ agent_context: agentContext }) });
      setContextSaved(true);
      setTimeout(() => setContextSaved(false), 3000);
    } catch (e) {
      setError("Error guardando contexto: " + e.message);
    } finally {
      setContextSaving(false);
    }
  }

  async function handleRun() {
    setRunning(true);
    setRunResult(null);
    setError("");
    try {
      const result = await agentFetch("/run");
      setRunResult(result);
      loadStats();
    } catch (e) {
      setError("Error al ejecutar el agente: " + e.message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="page agent-page">
      {preview && (
        <EmailPreviewModal lead={preview} onClose={() => setPreview(null)} />
      )}

      {/* HEADER */}
      <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Agente IA</h1>
          <p className="page-sub">Prospección automática por email · Lun–Vie 8:00 AM ET</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <StatusPill active={!running} />
          <button
            className="btn btn-agent-run"
            onClick={handleRun}
            disabled={running}
          >
            {running ? "⏳ Ejecutando..." : "▶ Ejecutar ahora"}
          </button>
        </div>
      </div>

      {error && <div className="banner banner-danger" style={{ marginBottom: 16 }}>{error}</div>}

      {runResult && (
        <div className={`banner ${runResult.ok ? "banner-success" : "banner-danger"}`} style={{ marginBottom: 16 }}>
          {runResult.ok
            ? `✅ Ejecución completada · ${runResult.sent} emails enviados · ${runResult.skipped} omitidos · ${runResult.errors} errores`
            : `❌ Error: ${runResult.error}`}
        </div>
      )}

      {/* KPI ROW */}
      <div className="agent-kpi-row">
        <KpiCard
          label="Emails enviados (contactados)"
          value={stats?.contactados}
          sub="histórico total"
          color="green"
        />
        <KpiCard
          label="Pendientes con email"
          value={stats?.pendientes_email}
          sub="listos para enviar"
          color="blue"
        />
        <KpiCard
          label="Solo teléfono"
          value={stats?.pendientes_tel}
          sub="Fase B · llamadas IA"
          color="warn"
        />
        <KpiCard
          label="Total en sistema"
          value={stats?.total}
          sub="todos los leads"
          color="neutral"
        />
      </div>

      {/* LEADS CONTACTADOS */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="card-header">
          <span className="card-title">Leads contactados</span>
          <span className="badge">{stats?.contactados_recientes?.length ?? 0} recientes</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Nicho</th>
                <th>Ciudad</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!stats && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--color-text-muted)" }}>
                    Cargando...
                  </td>
                </tr>
              )}
              {stats?.contactados_recientes?.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--color-text-muted)" }}>
                    Aún no hay leads contactados
                  </td>
                </tr>
              )}
              {stats?.contactados_recientes?.map((lead) => (
                <tr key={lead.id}>
                  <td style={{ fontWeight: 600 }}>{lead.business_name}</td>
                  <td>
                    <span className="tag">{lead.niche}</span>
                  </td>
                  <td style={{ color: "var(--color-text-muted)", fontSize: 13 }}>{lead.city}</td>
                  <td style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                    {lead.email || <span style={{ opacity: 0.4 }}>—</span>}
                  </td>
                  <td>
                    <span className="status-badge status-badge--contacted">Contactado</span>
                  </td>
                  <td>
                    {lead.email ? (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setPreview(lead)}
                      >
                        Ver email
                      </button>
                    ) : (
                      <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Sin email</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONTEXTO EDITABLE */}
      <div className="card agent-config-card">
        <div className="card-header" style={{ borderBottom: "1px solid var(--color-border)", marginBottom: 14 }}>
          <span className="card-title">Contexto del agente</span>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            El agente leerá esto al generar cada email
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 0, marginBottom: 10 }}>
          Agrega aquí el pitch actual de tu agencia, promociones del mes, casos de éxito recientes o cualquier contexto
          que quieras que el agente use al redactar emails. Se aplica en la próxima ejecución sin redesplegar.
        </p>
        <textarea
          className="agent-context-textarea"
          value={agentContext}
          onChange={(e) => setAgentContext(e.target.value)}
          placeholder={`Ejemplo:\nEste mes tenemos una promoción: sitio web + Google Business Profile por $297/mes los primeros 3 meses.\nCaso de éxito: dentista en Orlando pasó de 5 a 40 reseñas en Google en 45 días.\nNo mencionar precios hasta la llamada de seguimiento.`}
          rows={6}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
          <button
            className="btn"
            onClick={handleSaveContext}
            disabled={contextSaving}
          >
            {contextSaving ? "Guardando..." : "Guardar contexto"}
          </button>
          {contextSaved && (
            <span style={{ color: "var(--color-success, #22c55e)", fontSize: 13 }}>✓ Guardado</span>
          )}
        </div>
      </div>

      {/* CONFIGURACIÓN */}
      <div className="card agent-config-card">
        <div className="card-title" style={{ marginBottom: 14 }}>Configuración del agente</div>
        <div className="agent-config-grid">
          <div className="agent-config-item">
            <div className="agent-config-label">URL del agente</div>
            <code className="agent-config-val">{AGENT_URL}</code>
          </div>
          <div className="agent-config-item">
            <div className="agent-config-label">Enviando desde</div>
            <code className="agent-config-val">agente@agenciashopservices.com</code>
          </div>
          <div className="agent-config-item">
            <div className="agent-config-label">Modelo IA</div>
            <code className="agent-config-val">claude-haiku-4-5-20251001</code>
          </div>
          <div className="agent-config-item">
            <div className="agent-config-label">Cron</div>
            <code className="agent-config-val">0 13 * * 1-5 (Lun–Vie 8AM ET)</code>
          </div>
        </div>
      </div>
    </div>
  );
}
