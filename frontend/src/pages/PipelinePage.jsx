import { useEffect, useState } from "react";
import { getLeads, updateContactStatus } from "../api";
import { CONTACT_STATUS_OPTIONS, PRIORITY_BADGE, scoreColor } from "../constants";
import Icon from "../components/Icon";
import LeadModal from "../components/LeadModal";

const STAGE_ICON = {
  "No contactado": "users",
  Contactado: "messageSquare",
  "Reunion agendada": "calendar",
  Cerrado: "check",
  Descartado: "x",
};

function isOverdue(lead) {
  return lead.next_follow_up && new Date(lead.next_follow_up) < new Date();
}

export default function PipelinePage() {
  const [leads, setLeads] = useState([]);
  const [error, setError] = useState("");
  const [activeLead, setActiveLead] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  useEffect(() => {
    refresh();
  }, []);

  function refresh() {
    getLeads()
      .then(setLeads)
      .catch((err) => setError(err.message));
  }

  async function moveLead(leadId, newStatus) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, contact_status: newStatus } : l)));
    try {
      await updateContactStatus(leadId, newStatus);
    } catch (err) {
      setError(err.message);
      refresh();
    }
  }

  function handleLeadUpdated(updated) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
    setActiveLead((prev) => (prev ? { ...prev, ...updated } : prev));
  }

  function onDragStart(e, leadId) {
    e.dataTransfer.setData("text/plain", String(leadId));
  }

  function onDrop(e, stage) {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = Number(e.dataTransfer.getData("text/plain"));
    if (leadId) moveLead(leadId, stage);
  }

  const leadsByStage = CONTACT_STATUS_OPTIONS.reduce((acc, stage) => {
    acc[stage] = leads.filter((l) => l.contact_status === stage);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <h2>Pipeline de prospeccion</h2>
        <p>Arrastra los leads entre columnas para actualizar su estado de contacto.</p>
      </div>

      {error && <div className="banner banner-danger">{error}</div>}

      <div className="pipeline-board">
        {CONTACT_STATUS_OPTIONS.map((stage) => (
          <div
            key={stage}
            className={`pipeline-column ${dragOverStage === stage ? "drag-over" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage);
            }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={(e) => onDrop(e, stage)}
          >
            <div className="pipeline-column-header">
              <Icon name={STAGE_ICON[stage] || "users"} size={15} />
              <span>{stage}</span>
              <span className="pipeline-count">{leadsByStage[stage].length}</span>
            </div>
            <div className="pipeline-column-body">
              {leadsByStage[stage].length === 0 && (
                <p className="pipeline-empty">Sin leads en esta etapa</p>
              )}
              {leadsByStage[stage].map((lead) => (
                <div
                  key={lead.id}
                  className="pipeline-card"
                  draggable
                  onDragStart={(e) => onDragStart(e, lead.id)}
                  onClick={() => setActiveLead(lead)}
                >
                  <div className="pipeline-card-top">
                    <strong>{lead.business_name}</strong>
                    <span className={`badge ${PRIORITY_BADGE[lead.priority] || "badge-muted"}`}>
                      {lead.priority || "—"}
                    </span>
                  </div>
                  <p className="pipeline-card-meta">{lead.niche} · {lead.city}</p>
                  <div className="pipeline-card-footer">
                    <span style={{ fontWeight: 700, color: scoreColor(lead.score), fontSize: 12 }}>
                      Score {lead.score}
                    </span>
                    {lead.next_follow_up && (
                      <span className={`pipeline-followup ${isOverdue(lead) ? "overdue" : ""}`}>
                        <Icon name="calendar" size={11} />
                        {new Date(lead.next_follow_up).toLocaleDateString("es", { day: "2-digit", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {activeLead && (
        <LeadModal lead={activeLead} onClose={() => setActiveLead(null)} onUpdated={handleLeadUpdated} />
      )}
    </div>
  );
}
