"""Clasificacion y scoring de oportunidad para leads."""

import unicodedata

from .niche_presets import NICHE_PRESETS

SOCIAL_DOMAINS = (
    "facebook.com",
    "fb.com",
    "instagram.com",
    "yelp.com",
    "wa.me",
    "whatsapp.com",
    "linktr.ee",
)

def _normalize(text: str) -> str:
    """Quita acentos y pasa a minusculas para comparaciones consistentes."""
    nfkd = unicodedata.normalize("NFKD", text)
    without_accents = "".join(c for c in nfkd if not unicodedata.combining(c))
    return without_accents.strip().lower()


# Nichos de alto valor (ticket promedio alto, buen ROI para paginas web)
HIGH_VALUE_NICHES = {
    _normalize(value)
    for niche in NICHE_PRESETS
    if niche["high_value"]
    for value in (niche["value"], niche["label_es"], niche["label_en"])
}

# Ciudades de alto poder adquisitivo (ejemplos, ampliable)
HIGH_INCOME_CITIES = {
    "miami", "beverly hills", "manhattan", "new york", "san francisco",
    "los angeles", "austin", "dallas", "houston", "chicago", "boston",
    "seattle", "san diego", "scottsdale", "naples", "palm beach",
    "santa monica", "newport beach", "atlanta",
    "monterrey", "ciudad de mexico", "polanco", "guadalajara",
}


def classify_website(website: str | None, website_unreachable: bool) -> str:
    """Determina el estado del sitio web del negocio."""
    if not website:
        return "sin_website"

    lowered = website.lower()
    if any(domain in lowered for domain in SOCIAL_DOMAINS):
        return "solo_red_social"

    if website_unreachable:
        return "website_deficiente"

    return "tiene_website"


def calculate_score(
    *,
    website_status: str,
    rating: float | None,
    reviews_count: int | None,
    phone: str | None,
    niche: str,
    city: str,
) -> int:
    score = 0

    if website_status == "sin_website":
        score += 40
    elif website_status == "solo_red_social":
        score += 35
    elif website_status == "website_deficiente":
        score += 30

    if rating is not None and rating > 4.3:
        score += 15

    if reviews_count is not None and reviews_count > 50:
        score += 15

    if phone:
        score += 10

    if _normalize(niche) in HIGH_VALUE_NICHES:
        score += 10

    if city.strip().lower() in HIGH_INCOME_CITIES:
        score += 10

    return min(score, 100)


def priority_from_score(score: int) -> str:
    if score >= 70:
        return "Alta"
    if score >= 40:
        return "Media"
    return "Baja"


def build_diagnosis(*, business_name: str, website_status: str, rating: float | None, reviews_count: int | None) -> str:
    parts = []

    if website_status == "sin_website":
        parts.append(f"{business_name} no tiene un sitio web propio.")
    elif website_status == "solo_red_social":
        parts.append(f"{business_name} solo usa redes sociales como presencia digital, sin website propio.")
    elif website_status == "website_deficiente":
        parts.append(f"{business_name} tiene un sitio web que parece no estar disponible o cargar correctamente.")
    else:
        parts.append(f"{business_name} ya cuenta con un sitio web.")

    if rating is not None and reviews_count is not None:
        if rating > 4.3 and reviews_count > 50:
            parts.append(f"Tiene buena reputacion ({rating}★, {reviews_count} reviews), lo que lo hace un buen candidato para mejorar su presencia online.")
        elif reviews_count and reviews_count > 0:
            parts.append(f"Cuenta con {reviews_count} reviews y rating de {rating}★.")

    if reviews_count == 0:
        parts.append("Parece ser un negocio nuevo o con poca presencia en Google (sin reviews).")

    return " ".join(parts)


def is_prospect(business_status: str | None, website_status: str) -> bool:
    """Filtra negocios cerrados permanentemente como no prospecto."""
    if business_status == "CLOSED_PERMANENTLY":
        return False
    return True
