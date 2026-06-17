const ITEMS = [
  { key: "total_leads", label: "Total de leads", icon: "📊", bg: "#ede9fe", color: "#7c3aed" },
  { key: "sin_website", label: "Sin website", icon: "🚫", bg: "#fee2e2", color: "#b91c1c" },
  { key: "website_debil", label: "Website debil", icon: "⚠️", bg: "#fef3c7", color: "#b45309" },
  { key: "leads_calientes", label: "Leads calientes", icon: "🔥", bg: "#ffedd5", color: "#ea580c" },
  { key: "contactados", label: "Contactados", icon: "✉️", bg: "#dbeafe", color: "#2563eb" },
  { key: "reuniones", label: "Reuniones", icon: "📅", bg: "#e0e7ff", color: "#4f46e5" },
  { key: "cerrados", label: "Cerrados", icon: "✅", bg: "#dcfce7", color: "#15803d" },
];

export default function DashboardStats({ stats }) {
  if (!stats) return null;

  return (
    <div className="stats-grid">
      {ITEMS.map((item) => (
        <div className="stat-card" key={item.key}>
          <div className="stat-icon" style={{ background: item.bg, color: item.color }}>
            {item.icon}
          </div>
          <div className="stat-value">{stats[item.key] ?? 0}</div>
          <div className="stat-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
