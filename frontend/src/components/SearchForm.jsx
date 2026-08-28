import { useEffect, useState } from "react";
import { getNiches } from "../api";
import Icon from "./Icon";

const initialState = {
  niche: "",
  city: "",
  state: "",
  country: "",
  zip_code: "",
  language: "es",
  radius_miles: 3,
  max_results: 20,
};

const FREQ_LABELS = { none: "Manual", daily: "Diaria", weekly: "Semanal", monthly: "Mensual" };

export default function SearchForm({ onSearch, onSaveSearch, loading, savedSearches = [], onRunSaved, onDeleteSaved, onFrequencyChange }) {
  const [form, setForm] = useState(initialState);
  const [nicheGroups, setNicheGroups] = useState({});
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getNiches().then(setNicheGroups).catch(() => setNicheGroups({}));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "radius_miles" || name === "max_results" ? Number(value) : value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.niche || !form.country) return;
    if (!form.city && !form.zip_code) return;
    onSearch(form);
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <form onSubmit={handleSubmit}>
        <div className="search-bar-row" style={{ borderBottom: expanded ? "1px solid var(--color-border)" : "none" }}>
          <div style={{ flex: 2, position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", pointerEvents: "none" }}>
              <Icon name="search" size={15} />
            </span>
            <input
              name="niche"
              list="niche-options"
              placeholder="Nicho: dentista, restaurante, gym..."
              value={form.niche}
              onChange={handleChange}
              required
              style={{ width: "100%", paddingLeft: 32, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: 14, height: 40, boxSizing: "border-box" }}
            />
            <datalist id="niche-options">
              {Object.entries(nicheGroups).map(([, items]) =>
                items.map((item) => <option key={item.value} value={item.value} label={item.label_es} />)
              )}
            </datalist>
          </div>

          <div className="search-bar-sep" />

          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", pointerEvents: "none" }}>
              <Icon name="mapPin" size={15} />
            </span>
            <input
              name="city"
              placeholder="Ciudad"
              value={form.city}
              onChange={handleChange}
              style={{ width: "100%", paddingLeft: 30, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: 14, height: 40, boxSizing: "border-box" }}
            />
          </div>

          <div className="search-bar-sep" />

          <div style={{ flex: 1 }}>
            <input
              name="country"
              placeholder="País (USA, Colombia...)"
              value={form.country}
              onChange={handleChange}
              required
              style={{ width: "100%", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: 14, height: 40, padding: "0 12px", boxSizing: "border-box" }}
            />
          </div>

          <div className="search-bar-actions">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              style={{ height: 40, padding: "0 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)", color: "var(--color-text-muted)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}
            >
              <Icon name="sliders" size={14} />
              {expanded ? "Menos" : "Más opciones"}
            </button>
            <button className="btn" type="submit" disabled={loading} style={{ height: 40, whiteSpace: "nowrap" }}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block" }} />
                  Buscando...
                </span>
              ) : (
                <><Icon name="search" size={14} /> Buscar</>
              )}
            </button>
          </div>
        </div>

        {expanded && (
          <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, borderBottom: "1px solid var(--color-border)" }}>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: 12 }}>Estado / Provincia</label>
              <input name="state" placeholder="Ej. Florida" value={form.state} onChange={handleChange} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: 12 }}>Código postal</label>
              <input name="zip_code" placeholder="Ej. 33125" value={form.zip_code} onChange={handleChange} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: 12 }}>Idioma</label>
              <select name="language" value={form.language} onChange={handleChange}>
                <option value="es">Español</option>
                <option value="en">Inglés</option>
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: 12 }}>Radio (millas)</label>
              <input name="radius_miles" type="number" min="1" max="30" step="0.5" value={form.radius_miles} onChange={handleChange} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ fontSize: 12 }}>Máx. resultados</label>
              <input name="max_results" type="number" min="1" max="60" value={form.max_results} onChange={handleChange} />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              {onSaveSearch && (
                <button type="button" className="btn btn-secondary" style={{ width: "100%", fontSize: 13 }} onClick={() => onSaveSearch(form)}>
                  <Icon name="bookmark" size={14} /> Guardar búsqueda
                </button>
              )}
            </div>
          </div>
        )}
      </form>

      {savedSearches.length > 0 && (
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Búsquedas automáticas
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {savedSearches.map((s) => {
              const isAuto = s.frequency && s.frequency !== "none";
              return (
                <div key={s.id} style={{ display: "inline-flex", alignItems: "center", borderRadius: 8, border: `1px solid ${isAuto ? "#7c3aed" : "var(--color-border)"}`, overflow: "hidden", fontSize: 13, background: isAuto ? "rgba(124,58,237,0.06)" : "var(--color-surface)" }}>
                  <button
                    type="button"
                    onClick={() => onRunSaved && onRunSaved(s.id)}
                    disabled={loading}
                    style={{ padding: "6px 12px", background: "transparent", border: "none", color: "var(--color-text)", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}
                    title={`${s.niche} · ${s.city || s.zip_code} ${s.country}`}
                  >
                    <Icon name="zap" size={12} style={{ color: isAuto ? "#7c3aed" : "var(--color-text-muted)" }} />
                    {s.name}
                  </button>
                  <div style={{ width: 1, background: isAuto ? "rgba(124,58,237,0.3)" : "var(--color-border)", alignSelf: "stretch" }} />
                  <select
                    value={s.frequency || "none"}
                    onChange={(e) => onFrequencyChange && onFrequencyChange(s.id, e.target.value)}
                    style={{ padding: "6px 8px", background: "transparent", border: "none", color: isAuto ? "#7c3aed" : "var(--color-text-muted)", fontSize: 12, cursor: "pointer", fontWeight: isAuto ? 600 : 400 }}
                    title="Frecuencia automática"
                  >
                    {Object.entries(FREQ_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <div style={{ width: 1, background: isAuto ? "rgba(124,58,237,0.3)" : "var(--color-border)", alignSelf: "stretch" }} />
                  <button
                    type="button"
                    onClick={() => onDeleteSaved && onDeleteSaved(s.id)}
                    style={{ padding: "6px 8px", background: "transparent", border: "none", color: "var(--color-text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
                    title="Eliminar"
                  >
                    <Icon name="x" size={11} />
                  </button>
                </div>
              );
            })}
          </div>
          {savedSearches.some(s => s.frequency && s.frequency !== "none") && (
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 8, marginBottom: 0 }}>
              ⚡ Las búsquedas activas se ejecutan automáticamente. Llegarás y ya habrá leads nuevos.
            </p>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
