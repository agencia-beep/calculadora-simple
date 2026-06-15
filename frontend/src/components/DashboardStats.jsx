const ITEMS = [
  { key: "total_leads", label: "Total de leads" },
  { key: "sin_website", label: "Sin website" },
  { key: "website_debil", label: "Website debil" },
  { key: "leads_calientes", label: "Leads calientes" },
  { key: "contactados", label: "Contactados" },
  { key: "reuniones", label: "Reuniones" },
  { key: "cerrados", label: "Cerrados" },
];

export default function DashboardStats({ stats }) {
  if (!stats) return null;

  return (
    <div className="stats-grid">
      {ITEMS.map((item) => (
        <div className="stat-card" key={item.key}>
          <div className="stat-value">{stats[item.key] ?? 0}</div>
          <div className="stat-label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
