import { useEffect, useState } from "react";
import {
  getSequences, createSequence, deleteSequence,
  getDueEnrollments, advanceEnrollment, stopEnrollment,
} from "../api";
import Icon from "../components/Icon";

const ACTION_LABELS = {
  whatsapp: { label: "WhatsApp", color: "#16a34a", bg: "#dcfce7", icon: "mail" },
  email: { label: "Email", color: "#2563eb", bg: "#dbeafe", icon: "mail" },
  call: { label: "Llamada", color: "#ea580c", bg: "#ffedd5", icon: "phone" },
  note: { label: "Nota", color: "#7c3aed", bg: "#ede9fe", icon: "edit" },
};

const DEFAULT_STEPS = [
  { step_number: 1, day_offset: 0, action_type: "whatsapp", message_template: "" },
  { step_number: 2, day_offset: 3, action_type: "email", message_template: "" },
  { step_number: 3, day_offset: 7, action_type: "call", message_template: "" },
];

function Badge({ type }) {
  const a = ACTION_LABELS[type] || { label: type, color: "#64748b", bg: "#f1f5f9" };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
      background: a.bg, color: a.color, letterSpacing: "0.02em",
    }}>{a.label}</span>
  );
}

function StepRow({ step, index, onChange, onRemove }) {
  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "flex-start",
      padding: "12px 14px", background: "#f8fafc", borderRadius: 10,
      border: "1px solid #e2e8f0",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#8b5cf6,#6366f1)",
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 800, flexShrink: 0,
      }}>{step.step_number}</div>
      <div style={{ flex: 1, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <select value={step.action_type} onChange={(e) => onChange(index, "action_type", e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, background: "#fff" }}>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Email</option>
          <option value="call">Llamada</option>
          <option value="note">Nota interna</option>
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>Dia</span>
          <input type="number" min={0} value={step.day_offset}
            onChange={(e) => onChange(index, "day_offset", parseInt(e.target.value) || 0)}
            style={{ width: 60, padding: "6px 8px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, textAlign: "center" }} />
        </div>
        <input type="text" placeholder="Mensaje o instruccion (opcional)" value={step.message_template || ""}
          onChange={(e) => onChange(index, "message_template", e.target.value)}
          style={{ flex: 1, minWidth: 160, padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }} />
      </div>
      <button onClick={() => onRemove(index)} style={{
        background: "none", border: "none", color: "#94a3b8", cursor: "pointer",
        padding: 4, borderRadius: 6, fontSize: 16, lineHeight: 1,
      }}>×</button>
    </div>
  );
}

function CreateModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [steps, setSteps] = useState(DEFAULT_STEPS);
  const [saving, setSaving] = useState(false);

  function changeStep(i, field, val) {
    setSteps((s) => s.map((st, idx) => idx === i ? { ...st, [field]: val } : st));
  }
  function addStep() {
    const last = steps[steps.length - 1];
    setSteps((s) => [...s, {
      step_number: s.length + 1,
      day_offset: (last?.day_offset || 0) + 3,
      action_type: "whatsapp",
      message_template: "",
    }]);
  }
  function removeStep(i) {
    setSteps((s) => s.filter((_, idx) => idx !== i).map((st, idx) => ({ ...st, step_number: idx + 1 })));
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const seq = await createSequence({ name: name.trim(), description: desc, steps });
      onCreate(seq);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 20, padding: 28, width: "100%", maxWidth: 640,
        maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 60px rgba(15,23,42,0.2)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 900, fontSize: 20, color: "#0f172a" }}>Nueva secuencia</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8" }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 5 }}>NOMBRE</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Secuencia realtors 7 dias"
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 5 }}>DESCRIPCION (opcional)</label>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Para que tipo de leads..."
            style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
        </div>

        <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", marginBottom: 12 }}>Pasos de la secuencia</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {steps.map((s, i) => (
            <StepRow key={i} step={s} index={i} onChange={changeStep} onRemove={removeStep} />
          ))}
        </div>
        <button onClick={addStep} style={{
          background: "none", border: "1px dashed #cbd5e1", borderRadius: 10, padding: "8px 16px",
          color: "#64748b", cursor: "pointer", fontSize: 13, width: "100%", marginBottom: 20,
        }}>+ Agregar paso</button>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 14 }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim()} style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#8b5cf6,#6366f1)", color: "#fff",
            fontWeight: 700, cursor: "pointer", fontSize: 14, opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "Guardando..." : "Crear secuencia"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DueCard({ enrollment, onAdvance, onStop }) {
  const a = ACTION_LABELS[enrollment.action_type] || ACTION_LABELS.note;
  const [loading, setLoading] = useState(false);

  async function handleAdvance() {
    setLoading(true);
    try { await onAdvance(enrollment.id); } finally { setLoading(false); }
  }
  async function handleStop() {
    setLoading(true);
    try { await onStop(enrollment.id); } finally { setLoading(false); }
  }

  return (
    <div style={{
      background: "#fff", border: `1px solid ${a.color}33`, borderRadius: 14,
      padding: 18, boxShadow: `0 4px 20px ${a.color}11`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{enrollment.lead_name}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{enrollment.sequence_name} · Paso {enrollment.current_step}</div>
        </div>
        <Badge type={enrollment.action_type} />
      </div>

      {enrollment.message_template && (
        <div style={{
          fontSize: 13, color: "#475569", background: "#f8fafc", borderRadius: 8,
          padding: "10px 12px", marginBottom: 12, borderLeft: `3px solid ${a.color}`,
        }}>
          {enrollment.message_template}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {enrollment.lead_phone && (
          <a href={`https://wa.me/${enrollment.lead_phone?.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
            style={{
              fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8,
              background: "#dcfce7", color: "#16a34a", textDecoration: "none",
            }}>
            WhatsApp
          </a>
        )}
        {enrollment.lead_email && (
          <a href={`mailto:${enrollment.lead_email}`}
            style={{
              fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8,
              background: "#dbeafe", color: "#2563eb", textDecoration: "none",
            }}>
            Email
          </a>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={handleStop} disabled={loading} style={{
          fontSize: 12, padding: "6px 14px", borderRadius: 8,
          border: "1px solid #e2e8f0", background: "#f8fafc", color: "#94a3b8", cursor: "pointer",
        }}>Detener</button>
        <button onClick={handleAdvance} disabled={loading} style={{
          fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8,
          background: "linear-gradient(135deg,#8b5cf6,#6366f1)", color: "#fff", border: "none", cursor: "pointer",
        }}>
          {loading ? "..." : "Marcar hecho ✓"}
        </button>
      </div>
    </div>
  );
}

export default function SequencesPage() {
  const [sequences, setSequences] = useState([]);
  const [due, setDue] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [seqs, dueList] = await Promise.all([getSequences(), getDueEnrollments()]);
      setSequences(seqs);
      setDue(dueList);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdvance(id) {
    await advanceEnrollment(id);
    load();
  }
  async function handleStop(id) {
    await stopEnrollment(id);
    load();
  }
  async function handleDelete(id) {
    if (!confirm("¿Eliminar esta secuencia?")) return;
    await deleteSequence(id);
    load();
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>Secuencias</h2>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14 }}>
            Automatiza tu proceso de seguimiento paso a paso
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          padding: "10px 22px", borderRadius: 12, border: "none",
          background: "linear-gradient(135deg,#8b5cf6,#6366f1)", color: "#fff",
          fontWeight: 700, fontSize: 14, cursor: "pointer",
          boxShadow: "0 4px 14px #8b5cf644",
        }}>
          + Nueva secuencia
        </button>
      </div>

      {/* Tareas de hoy */}
      {due.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
          }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>Tareas de hoy</div>
            <span style={{ fontSize: 12, fontWeight: 800, background: "#fee2e2", color: "#b91c1c", borderRadius: 20, padding: "3px 10px" }}>
              {due.length} pendientes
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
            {due.map((e) => (
              <DueCard key={e.id} enrollment={e} onAdvance={handleAdvance} onStop={handleStop} />
            ))}
          </div>
        </div>
      )}

      {due.length === 0 && !loading && (
        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 14,
          padding: "20px 24px", marginBottom: 28, display: "flex", alignItems: "center", gap: 14,
        }}>
          <span style={{ fontSize: 28 }}>✅</span>
          <div>
            <div style={{ fontWeight: 700, color: "#15803d" }}>Sin tareas pendientes por ahora</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
              Inscribe leads en secuencias desde su perfil para que aparezcan aqui cuando sea momento de contactarlos.
            </div>
          </div>
        </div>
      )}

      {/* Secuencias guardadas */}
      <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a", marginBottom: 14 }}>
        Mis secuencias ({sequences.length})
      </div>

      {loading && <p style={{ color: "#94a3b8" }}>Cargando...</p>}

      {!loading && sequences.length === 0 && (
        <div style={{
          textAlign: "center", padding: "48px 24px", background: "#f8fafc",
          borderRadius: 16, border: "1px dashed #cbd5e1",
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔁</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#334155", marginBottom: 6 }}>
            No tienes secuencias aun
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>
            Crea una secuencia para automatizar tu proceso de seguimiento
          </div>
          <button onClick={() => setShowCreate(true)} style={{
            padding: "10px 24px", borderRadius: 10, border: "none",
            background: "linear-gradient(135deg,#8b5cf6,#6366f1)", color: "#fff",
            fontWeight: 700, cursor: "pointer", fontSize: 14,
          }}>Crear primera secuencia</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {sequences.map((seq) => (
          <div key={seq.id} style={{
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16,
            padding: 22, boxShadow: "var(--shadow)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{seq.name}</div>
                {seq.description && <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{seq.description}</div>}
              </div>
              <button onClick={() => handleDelete(seq.id)} style={{
                background: "none", border: "none", color: "#94a3b8",
                cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4,
              }}>×</button>
            </div>

            <div style={{ display: "flex", gap: 0, alignItems: "center", flexWrap: "wrap" }}>
              {seq.steps.map((step, i) => (
                <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "10px 14px", background: "#f8fafc", borderRadius: 10,
                    border: "1px solid #e2e8f0", minWidth: 90, textAlign: "center",
                  }}>
                    <Badge type={step.action_type} />
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>
                      Dia {step.day_offset}
                    </div>
                    {step.message_template && (
                      <div style={{ fontSize: 10, color: "#64748b", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {step.message_template}
                      </div>
                    )}
                  </div>
                  {i < seq.steps.length - 1 && (
                    <div style={{ color: "#cbd5e1", fontSize: 18, padding: "0 6px" }}>→</div>
                  )}
                </div>
              ))}
              {seq.steps.length === 0 && (
                <span style={{ fontSize: 13, color: "#94a3b8" }}>Sin pasos definidos</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={(seq) => setSequences((s) => [seq, ...s])}
        />
      )}
    </div>
  );
}
