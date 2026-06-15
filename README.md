# Local Web Lead Finder

Aplicación interna para encontrar negocios locales sin website o con presencia
digital débil, calcular un score de oportunidad y generar mensajes de
prospección (WhatsApp, email, guion de llamada).

## Estructura

- `backend/` — API en FastAPI (Python). SQLite local por defecto.
- `frontend/` — App en React (Vite).

## Backend

> Requiere Python 3.10–3.12 (Python 3.14 aún no tiene wheels precompilados
> para `pydantic-core` y la instalación puede fallar).

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy .env.example .env
# Edita .env y agrega tu GOOGLE_PLACES_API_KEY (y opcionalmente ANTHROPIC_API_KEY)
uvicorn app.main:app --reload --port 8000
```

### Variables de entorno (`backend/.env`)

- `GOOGLE_PLACES_API_KEY` — requerida para buscar negocios (Geocoding API + Places API,
  habilítalas en Google Cloud Console).
- `ANTHROPIC_API_KEY` — opcional. Si se configura, los mensajes (WhatsApp, email,
  guion, diagnóstico) se generan con Claude. Si no, se usan plantillas.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173 — el frontend hace proxy de `/api` hacia
`http://localhost:8000` (backend).

## Flujo de uso

1. En "Buscar leads", ingresa nicho, ciudad, estado, país, radio y máximo de
   resultados, y haz clic en "Buscar negocios".
2. La app consulta Google Places, clasifica cada negocio según su presencia
   web y calcula un score de oportunidad (0-100).
3. Desde la tabla puedes generar mensajes de prospección, cambiar el estado
   de contacto y exportar todo a CSV.
4. En "Dashboard" ves un resumen del pipeline (total de leads, sin website,
   leads calientes, contactados, reuniones, cerrados).

## Notas

- Solo se usan APIs oficiales de Google (Geocoding + Places). No se hace
  scraping de sitios de terceros.
- La verificación de "website deficiente" hace una petición HTTP simple al
  sitio para ver si responde.
