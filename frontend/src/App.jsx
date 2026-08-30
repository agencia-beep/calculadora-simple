import { useEffect, useState } from "react";
import DashboardPage from "./pages/DashboardPage";
import LeadsPage from "./pages/LeadsPage";
import PipelinePage from "./pages/PipelinePage";
import SequencesPage from "./pages/SequencesPage";
import AgentPage from "./pages/AgentPage";
import { clearClientToken, getClientToken, getHealth, setClientToken } from "./api";
import Icon from "./components/Icon";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

function AccessGate({ onAccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const resp = await fetch(`${BASE_URL.replace("/api", "")}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!resp.ok) {
        setError("Usuario o contraseña incorrectos.");
        return;
      }
      const data = await resp.json();
      setClientToken(data.token);
      onAccess();
    } catch {
      setError("No se pudo conectar al servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="access-gate">
      <form className="card" style={{ maxWidth: 380, width: "100%" }} onSubmit={handleSubmit}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img src="/logo.png" alt="Finder App" style={{ maxWidth: 180, height: "auto" }} />
        </div>
        <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginTop: 0 }}>
          Ingresa tus credenciales para acceder.
        </p>
        {error && <div className="banner banner-danger" style={{ marginBottom: 12 }}>{error}</div>}
        <div className="field">
          <label htmlFor="email">Correo electronico</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="email" />
        </div>
        <div className="field">
          <label htmlFor="password">Contrasena</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("leads");
  const [health, setHealth] = useState(null);
  const [authed, setAuthed] = useState(!!getClientToken());

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: "error" }));
  }, []);

  useEffect(() => {
    function handleAuthError() {
      setAuthed(false);
    }
    window.addEventListener("auth-error", handleAuthError);
    return () => window.removeEventListener("auth-error", handleAuthError);
  }, []);

  if (!authed) {
    return <AccessGate onAccess={() => setAuthed(true)} />;
  }

  function handleLogout() {
    clearClientToken();
    setAuthed(false);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top-bar">
          <img src="/logo.png" alt="Finder App" className="sidebar-logo" />
          <div className="sidebar-footer" style={{ marginTop: 0, paddingTop: 0 }}>
            <nav>
              <button onClick={handleLogout} title="Cerrar sesion">
                <Icon name="logout" size={16} />
                <span className="sidebar-btn-label">Salir</span>
              </button>
            </nav>
          </div>
        </div>
        <div className="subtitle">Prospeccion de negocios locales</div>
        <nav>
          <div className="nav-label">Menu</div>
          <button className={page === "leads" ? "active" : ""} onClick={() => setPage("leads")}>
            <Icon name="search" size={16} />
            <span className="sidebar-btn-label">Buscar leads</span>
          </button>
          <button className={page === "pipeline" ? "active" : ""} onClick={() => setPage("pipeline")}>
            <Icon name="trendingUp" size={16} />
            <span className="sidebar-btn-label">Pipeline</span>
          </button>
          <button className={page === "dashboard" ? "active" : ""} onClick={() => setPage("dashboard")}>
            <Icon name="grid" size={16} />
            <span className="sidebar-btn-label">Dashboard</span>
          </button>
          <button className={page === "sequences" ? "active" : ""} onClick={() => setPage("sequences")}>
            <Icon name="zap" size={16} />
            <span className="sidebar-btn-label">Secuencias</span>
          </button>
          <button className={page === "agent" ? "active" : ""} onClick={() => setPage("agent")}>
            <Icon name="cpu" size={16} />
            <span className="sidebar-btn-label">Agente IA</span>
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {health && health.google_places_configured === false && (
          <div className="banner" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="alert" size={18} style={{ flexShrink: 0 }} />
            <span>
              La API key de Google Places no esta configurada en el backend (archivo <code>.env</code>).
              Las busquedas no funcionaran hasta que agregues <code>GOOGLE_PLACES_API_KEY</code>.
            </span>
          </div>
        )}

        {page === "leads" && <LeadsPage />}
        {page === "pipeline" && <PipelinePage />}
        {page === "dashboard" && <DashboardPage />}
        {page === "sequences" && <SequencesPage />}
        {page === "agent" && <AgentPage />}
      </main>
    </div>
  );
}
