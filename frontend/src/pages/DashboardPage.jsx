import { useEffect, useState } from "react";
import { getDashboard } from "../api";
import DashboardStats from "../components/DashboardStats";

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard()
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Resumen general de tu pipeline de prospeccion.</p>
      </div>

      {error && <div className="banner banner-danger">{error}</div>}

      <DashboardStats stats={stats} />
    </div>
  );
}
