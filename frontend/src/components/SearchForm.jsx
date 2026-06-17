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
  radius_km: 5,
  max_results: 20,
};

export default function SearchForm({ onSearch, onSaveSearch, loading }) {
  const [form, setForm] = useState(initialState);
  const [niceGroups, setNicheGroups] = useState({});

  useEffect(() => {
    getNiches()
      .then(setNicheGroups)
      .catch(() => setNicheGroups({}));
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "radius_km" || name === "max_results" ? Number(value) : value,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.niche || !form.country) return;
    if (!form.city && !form.zip_code) return;
    onSearch(form);
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="niche">Nicho o categoria</label>
          <input
            id="niche"
            name="niche"
            list="niche-options"
            placeholder="Ej. dentista, restaurante"
            value={form.niche}
            onChange={handleChange}
            required
          />
          <datalist id="niche-options">
            {Object.entries(niceGroups).map(([category, items]) =>
              items.map((item) => (
                <option key={item.value} value={item.value} label={`${item.label_es} / ${item.label_en} (${category})`} />
              ))
            )}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="city">Ciudad</label>
          <input id="city" name="city" placeholder="Ej. Miami" value={form.city} onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="state">Estado</label>
          <input id="state" name="state" placeholder="Ej. Florida" value={form.state} onChange={handleChange} />
        </div>
        <div className="field">
          <label htmlFor="country">Pais</label>
          <input id="country" name="country" placeholder="Ej. USA" value={form.country} onChange={handleChange} required />
        </div>
        <div className="field">
          <label htmlFor="zip_code">Codigo postal (zip)</label>
          <input
            id="zip_code"
            name="zip_code"
            placeholder="Ej. 33125"
            value={form.zip_code}
            onChange={handleChange}
          />
        </div>
        <div className="field">
          <label htmlFor="language">Idioma de busqueda</label>
          <select id="language" name="language" value={form.language} onChange={handleChange}>
            <option value="es">Espanol</option>
            <option value="en">Ingles</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="radius_km">Radio de busqueda (km)</label>
          <input
            id="radius_km"
            name="radius_km"
            type="number"
            min="1"
            max="50"
            step="0.5"
            value={form.radius_km}
            onChange={handleChange}
          />
        </div>
        <div className="field">
          <label htmlFor="max_results">Maximo de resultados</label>
          <input
            id="max_results"
            name="max_results"
            type="number"
            min="1"
            max="60"
            value={form.max_results}
            onChange={handleChange}
          />
        </div>
      </div>

      <p style={{ marginTop: 12, fontSize: 13, color: "#6b7280" }}>
        Indica ciudad o codigo postal (al menos uno) junto con el pais.
      </p>

      <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
        <button className="btn" type="submit" disabled={loading}>
          <Icon name="search" size={16} /> {loading ? "Buscando..." : "Buscar negocios"}
        </button>
        {onSaveSearch && (
          <button type="button" className="btn btn-secondary" onClick={() => onSaveSearch(form)}>
            <Icon name="bookmark" size={16} /> Guardar esta busqueda
          </button>
        )}
      </div>
    </form>
  );
}
