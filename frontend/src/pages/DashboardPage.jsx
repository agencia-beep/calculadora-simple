import { useEffect, useState } from "react";
import { getDashboard, getLeads } from "../api";
import Icon from "../components/Icon";

function StatCard({ label, value, icon, color, bg, subtitle, alert }) {
  return (
    <div className="stat-card" style={alert ? { borderColor: "#fca5a5", background: "#fff5f5" } : {}}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div className="stat-icon" style={{ background: bg, color }}>
          <Icon name={icon} size={20} />
        </div>
        {alert && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c", background: "#fee2e2", borderRadius: 20, padding: "2px 8px" }}>
            URGENTE
          </span>
        )}
      </div>
      <div className="stat-value" style={alert ? { color: "#b91c1c" } : {}}>{value ?? 0}</div>
      <div className="stat-label">{label}</div>
      {subtitle && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{subtitle}</div>}
    </div>
  );
}

function FunnelBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 13 }}>
        <span style={{ fontWeight: 600, color: "#334155" }}>{label}</span>
        <span style={{ color: "#64748b" }}>
          {value} <span style={{ fontSize: 11 }}>({pct}%)</span>
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "#e2e8f0", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function WeeklyChart({ leads }) {
  const days = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
  const counts = Array(7).fill(0);
  const now = new Date();

  leads.forEach((l) => {
    const d = new Date(l.created_at);
    const diff = Math.floor((now - d) / 86400000);
    if (diff < 7) counts[d.getDay()]++;
  });

  const max = Math.max(...counts, 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80, marginTop: 8 }}>
      {counts.map((c, i) => {
        const isToday = i === now.getDay();
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>{c > 0 ? c : ""}</span>
            <div style={{
              width: "100%",
              borderRadius: 4,
              height: `${Math.max((c / max) * 60, 4)}px`,
              background: isToday ? "linear-gradient(135deg,#8b5cf6,#6366f1)" : "#e2e8f0",
              transition: "height 0.5s ease",
            }} />
            <span style={{ fontSize: 10, color: isToday ? "#8b5cf6" : "#94a3b8", fontWeight: isToday ? 700 : 400 }}>
              {days[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function OverdueList({ leads }) {
  const overdue = leads.filter(
    (l) => l.next_follow_up && new Date(l.next_follow_up) < new Date() && l.contact_status !== "Cerrado"
  ).slice(0, 5);

  if (overdue.length === 0) {
    return <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Sin seguimientos vencidos</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {overdue.map((l) => (
        <div key={l.id} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 14px", borderRadius: 8, background: "#fff5f5", border: "1px solid #fca5a5",
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{l.business_name}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{l.niche} · {l.city}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#b91c1c" }}>
              {new Date(l.next_follow_up).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>{l.contact_status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HotLeads({ leads }) {
  const hot = leads
    .filter((l) => l.priority === "Alta" && l.contact_status === "No contactado")
    .slice(0, 5);

  if (hot.length === 0) {
    return <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>No hay leads calientes sin contactar.</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {hot.map((l) => (
        <div key={l.id} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 14px", borderRadius: 8, background: "#fff7ed", border: "1px solid #fed7aa",
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{l.business_name}</div>
            <div style={{ fontSize: 11, color: "#64748b" }}>{l.niche} · {l.city}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#ea580c" }}>Score {l.score}</div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>
              {l.website_status === "sin_website" ? "Sin web" : "Web debil"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard().then(setStats).catch((e) => setError(e.message));
    getLeads().then(setLeads).catch(() => {});
  }, []);

  const convRate =
    stats && stats.total_leads > 0 ? Math.round((stats.cerrados / stats.total_leads) * 100) : 0;

  const thisWeek = leads.filter((l) => (new Date() - new Date(l.created_at)) / 86400000 < 7).length;

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h2>Dashboard</h2>
          <p>Resumen de tu pipeline de prospeccion en tiempo real.</p>
        </div>
        <div style={{ fontSize: 13, color: "#64748b", textAlign: "right" }}>
          <span style={{ fontWeight: 800, color: "#8b5cf6", fontSize: 28 }}>{convRate}%</span>
          <br />
          <span>tasa de cierre</span>
        </div>
      </div>

      {error && <div className="banner banner-danger">{error}</div>}

      {/* KPIs */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard label="Total de leads" value={stats?.total_leads} icon="users" bg="#ede9fe" color="#7c3aed"
          subtitle={`+${thisWeek} esta semana`} />
        <StatCard label="Sin website" value={stats?.sin_website} icon="globeOff" bg="#fee2e2" color="#b91c1c"
          subtitle="Oportunidad de venta" />
        <StatCard label="Website debil" value={stats?.website_debil} icon="alert" bg="#fef3c7" color="#b45309"
          subtitle="Candidatos a rediseno" />
        <StatCard label="Leads calientes" value={stats?.leads_calientes} icon="flame" bg="#ffedd5" color="#ea580c"
          subtitle="Score alto, contactar ya" />
        <StatCard label="Contactados" value={stats?.contactados} icon="mail" bg="#dbeafe" color="#2563eb" />
        <StatCard label="Reuniones" value={stats?.reuniones} icon="calendar" bg="#e0e7ff" color="#4f46e5" />
        <StatCard label="Cerrados" value={stats?.cerrados} icon="check" bg="#dcfce7" color="#15803d"
          subtitle={`${convRate}% del total`} />
        <StatCard label="Seguimientos vencidos" value={stats?.seguimientos_vencidos} icon="alert"
          bg="#fee2e2" color="#b91c1c" alert={stats?.seguimientos_vencidos > 0} />
      </div>

      {/* Fila 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, color: "#1e293b" }}>Embudo de conversion</div>
          {stats ? (
            <>
              <FunnelBar label="Leads totales" value={stats.total_leads} total={stats.total_leads} color="#8b5cf6" />
              <FunnelBar label="Sin contactar" value={stats.total_leads - stats.contactados} total={stats.total_leads} color="#94a3b8" />
              <FunnelBar label="Contactados" value={stats.contactados} total={stats.total_leads} color="#3b82f6" />
              <FunnelBar label="Reuniones" value={stats.reuniones} total={stats.total_leads} color="#6366f1" />
              <FunnelBar label="Cerrados" value={stats.cerrados} total={stats.total_leads} color="#15803d" />
            </>
          ) : (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>Cargando...</p>
          )}
        </div>

        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b" }}>Leads por dia</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>Ultimos 7 dias</div>
          <WeeklyChart leads={leads} />
          <div style={{
            marginTop: 16, padding: "10px 14px", background: "#f8fafc",
            borderRadius: 8, display: "flex", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 12, color: "#64748b" }}>Esta semana</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#8b5cf6" }}>{thisWeek} nuevos</span>
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            Seguimientos vencidos
            {stats?.seguimientos_vencidos > 0 && (
              <span style={{ fontSize: 11, background: "#fee2e2", color: "#b91c1c", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                {stats.seguimientos_vencidos}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>Requieren accion inmediata</div>
          <OverdueList leads={leads} />
        </div>
      </div>

      {/* Fila 3 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b", marginBottom: 4 }}>
            Leads calientes sin contactar
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>Prioridad alta — contactar hoy</div>
          <HotLeads leads={leads} />
        </div>

        <div className="card">
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1e293b", marginBottom: 16 }}>
            Resumen de oportunidades
          </div>
          {stats && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Negocios sin website (prospectos A)", value: stats.sin_website, color: "#b91c1c", bg: "#fee2e2" },
                { label: "Negocios con web debil (prospectos B)", value: stats.website_debil, color: "#b45309", bg: "#fef3c7" },
                { label: "Total oportunidades detectadas", value: stats.sin_website + stats.website_debil, color: "#7c3aed", bg: "#ede9fe" },
                { label: "Ya en proceso de venta", value: stats.contactados, color: "#2563eb", bg: "#dbeafe" },
                { label: "Negocios ganados", value: stats.cerrados, color: "#15803d", bg: "#dcfce7" },
              ].map((row) => (
                <div key={row.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 12px", borderRadius: 8, background: row.bg,
                }}>
                  <span style={{ fontSize: 13, color: "#334155" }}>{row.label}</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: row.color }}>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
