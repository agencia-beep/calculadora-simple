import { useEffect, useState } from "react";
import DashboardPage from "./pages/DashboardPage";
import LeadsPage from "./pages/LeadsPage";
import { clearClientToken, getClientToken, getHealth, setClientToken } from "./api";
import Icon from "./components/Icon";

function AccessGate({ onAccess }) {
  const [token, setToken] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!token.trim()) return;
    setClientToken(token.trim());
    onAccess();
  }

  return (
    <div className="access-gate">
      <form className="card" style={{ maxWidth: 380, width: "100%" }} onSubmit={handleSubmit}>
        <h2 style={{ marginTop: 0 }}>Acceso</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
          Ingresa el token de acceso que te compartio tu agencia.
        </p>
        <div className="field">
          <label htmlFor="token">Token de acceso</label>
          <input id="token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Pega tu token aqui" />
        </div>
        <div style={{ marginTop: 16 }}>
          <button className="btn" type="submit">
            Entrar
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
        <h1>LeadFinder</h1>
        <div className="subtitle">Prospeccion de negocios locales</div>
        <nav>
          <div className="nav-label">Menu</div>
          <button className={page === "leads" ? "active" : ""} onClick={() => setPage("leads")}>
            <Icon name="search" size={18} /> Buscar leads
          </button>
          <button className={page === "dashboard" ? "active" : ""} onClick={() => setPage("dashboard")}>
            <Icon name="grid" size={18} /> Dashboard
          </button>
        </nav>
        <div className="sidebar-footer">
          <nav>
            <button onClick={handleLogout}>
              <Icon name="logout" size={18} /> Cerrar sesion
            </button>
          </nav>
        </div>
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
        {page === "dashboard" && <DashboardPage />}
      </main>
    </div>
  );
}
