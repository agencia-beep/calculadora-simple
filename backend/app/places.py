"""Cliente para Google Geocoding API y Places API (Nearby Search + Place Details).

Usa exclusivamente endpoints oficiales de Google con la API key del usuario.
"""

import os
import re
import time

import httpx

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
EMAIL_FILE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp")

GOOGLE_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")

GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"
NEARBY_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
PLACE_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"

DETAILS_FIELDS = (
    "name,formatted_address,formatted_phone_number,international_phone_number,"
    "website,rating,user_ratings_total,url,business_status,geometry,place_id,types"
)


class PlacesConfigError(Exception):
    pass


async def geocode_location(city: str, state: str, country: str, zip_code: str = "") -> tuple[float, float, str]:
    if not GOOGLE_API_KEY:
        raise PlacesConfigError("GOOGLE_PLACES_API_KEY no esta configurada en el backend (.env)")

    if zip_code:
        address_parts = [zip_code, country]
    else:
        address_parts = [city, state, country]
    address = ", ".join(p for p in address_parts if p)

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(GEOCODE_URL, params={"address": address, "key": GOOGLE_API_KEY})
        data = resp.json()

    if data.get("status") != "OK" or not data.get("results"):
        raise PlacesConfigError(f"No se pudo geocodificar '{address}': {data.get('status')}")

    result = data["results"][0]
    location = result["geometry"]["location"]
    return location["lat"], location["lng"], result.get("formatted_address", "")


async def nearby_search(lat: float, lng: float, radius_meters: int, keyword: str, max_results: int, language: str = "es") -> list[dict]:
    if not GOOGLE_API_KEY:
        raise PlacesConfigError("GOOGLE_PLACES_API_KEY no esta configurada en el backend (.env)")

    results: list[dict] = []
    params = {
        "location": f"{lat},{lng}",
        "radius": min(radius_meters, 50000),
        "keyword": keyword,
        "language": language,
        "key": GOOGLE_API_KEY,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        next_page_token = None
        while len(results) < max_results:
            if next_page_token:
                resp = await client.get(NEARBY_SEARCH_URL, params={"pagetoken": next_page_token, "key": GOOGLE_API_KEY})
            else:
                resp = await client.get(NEARBY_SEARCH_URL, params=params)

            data = resp.json()
            status = data.get("status")

            if status not in ("OK", "ZERO_RESULTS"):
                raise PlacesConfigError(f"Google Places error: {status} - {data.get('error_message', '')}")

            results.extend(data.get("results", []))

            next_page_token = data.get("next_page_token")
            if not next_page_token:
                break

            # Google requiere un breve delay antes de que el next_page_token sea valido
            import asyncio
            await asyncio.sleep(2)

    return results[:max_results]


async def get_place_details(place_id: str) -> dict:
    if not GOOGLE_API_KEY:
        raise PlacesConfigError("GOOGLE_PLACES_API_KEY no esta configurada en el backend (.env)")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            PLACE_DETAILS_URL,
            params={"place_id": place_id, "fields": DETAILS_FIELDS, "key": GOOGLE_API_KEY},
        )
        data = resp.json()

    if data.get("status") != "OK":
        return {}

    return data.get("result", {})


async def analyze_website(url: str) -> dict:
    """Hace una peticion al sitio para extraer email de contacto, medir velocidad
    de carga y detectar senales basicas de SEO (titulo, meta description, viewport, HTTPS)."""
    result: dict = {"email": None, "load_time_ms": None, "seo_notes": ""}
    if not url:
        return result

    try:
        start = time.monotonic()
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url)
        result["load_time_ms"] = int((time.monotonic() - start) * 1000)
        html = resp.text

        emails = [
            e for e in EMAIL_REGEX.findall(html)
            if not e.lower().endswith(EMAIL_FILE_EXTENSIONS)
        ]
        if emails:
            result["email"] = emails[0]

        notes = []
        if result["load_time_ms"] > 3000:
            notes.append("Carga lenta (>3s)")
        elif result["load_time_ms"] > 1500:
            notes.append("Carga moderada")
        else:
            notes.append("Carga rapida")

        if not url.lower().startswith("https"):
            notes.append("Sin HTTPS")

        if "viewport" not in html.lower():
            notes.append("Sin meta viewport (no responsive)")

        title_match = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        if not title_match or not title_match.group(1).strip():
            notes.append("Sin titulo SEO")

        if "description" not in html.lower():
            notes.append("Sin meta description")

        result["seo_notes"] = "; ".join(notes)
    except Exception:
        result["seo_notes"] = "No se pudo analizar el sitio"

    return result


async def check_website_reachable(url: str) -> bool:
    """Devuelve True si el sitio responde correctamente, False si parece no disponible."""
    if not url:
        return False

    try:
        async with httpx.AsyncClient(timeout=8, follow_redirects=True) as client:
            resp = await client.head(url)
            if resp.status_code >= 400:
                resp = await client.get(url)
            return resp.status_code < 400
    except Exception:
        return False
