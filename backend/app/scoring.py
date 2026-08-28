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


def is_already_covered(
    *,
    website_status: str,
    facebook_url: str | None,
    instagram_url: str | None,
    seo_notes: str,
    rating: float | None,
    reviews_count: int | None,
) -> bool:
    """Devuelve True si el negocio ya tiene una presencia digital solida y no es un buen prospecto."""
    if website_status not in ("tiene_website",):
        return False
    has_social = bool(facebook_url or instagram_url)
    good_seo = "lenta" not in (seo_notes or "").lower() and "sin" not in (seo_notes or "").lower()
    good_rating = (rating or 0) >= 4.5
    many_reviews = (reviews_count or 0) >= 200
    # Solo descarta si tiene todo en orden: web + redes + buen SEO + excelente reputacion
    return has_social and good_seo and good_rating and many_reviews


GAP_CATALOG = [
    # (id, condicion_fn, etiqueta, servicio, urgencia)
    # urgencia: alta | media | baja
    ("sin_website",       lambda d: d["website_status"] == "sin_website",              "Sin página web propia",          "Diseño de página web",                    "alta"),
    ("solo_red_social",   lambda d: d["website_status"] == "solo_red_social",          "Solo usa red social como web",    "Diseño de página web profesional",        "alta"),
    ("website_caido",     lambda d: d["website_status"] == "website_deficiente",       "Website caído o inaccesible",    "Rediseño y hosting confiable",            "alta"),
    ("carga_lenta",       lambda d: "lenta" in (d["seo_notes"] or ""),                 "Carga lenta (>3s)",              "Optimización de velocidad web",           "media"),
    ("sin_https",         lambda d: "sin https" in (d["seo_notes"] or "").lower(),     "Sin HTTPS / Sin seguridad SSL",  "Certificado SSL y hosting seguro",        "alta"),
    ("sin_responsive",    lambda d: "viewport" in (d["seo_notes"] or "").lower(),      "Sitio no responsive (móvil)",    "Diseño responsive / mobile-first",        "media"),
    ("sin_seo_titulo",    lambda d: "titulo" in (d["seo_notes"] or "").lower(),        "Sin título SEO",                 "Optimización SEO básica",                 "media"),
    ("sin_meta_desc",     lambda d: "description" in (d["seo_notes"] or "").lower(),   "Sin meta description",           "SEO on-page",                             "baja"),
    ("sin_facebook",      lambda d: not d["facebook_url"],                             "Sin página de Facebook",         "Gestión de redes sociales",               "media"),
    ("sin_instagram",     lambda d: not d["instagram_url"],                            "Sin perfil de Instagram",        "Marketing en Instagram",                  "media"),
    ("sin_email",         lambda d: not d["email"],                                    "Sin email de contacto visible",  "Email marketing y formulario de contacto","media"),
    ("pocas_resenas",     lambda d: (d["reviews_count"] or 0) < 20,                   "Menos de 20 reseñas en Google",  "Estrategia de captación de reseñas",      "media"),
    ("rating_bajo",       lambda d: (d["rating"] or 5) < 4.0 and (d["reviews_count"] or 0) > 5, "Rating menor a 4.0", "Gestión de reputación online",            "alta"),
    ("rating_medio",      lambda d: 4.0 <= (d["rating"] or 5) < 4.3 and (d["reviews_count"] or 0) > 5, "Rating entre 4.0 y 4.3", "Campaña de mejora de reputación", "baja"),
    ("idioma_diferente",  lambda d: d.get("language_mismatch"), "Sitio web no en español",         "Landing page en español",                 "media"),
]


def build_marketing_gaps(
    *,
    website_status: str,
    seo_notes: str,
    facebook_url: str | None,
    instagram_url: str | None,
    email: str | None,
    rating: float | None,
    reviews_count: int | None,
    language_mismatch: bool = False,
) -> list[dict]:
    """Retorna lista de carencias de marketing detectadas con el servicio recomendado."""
    ctx = {
        "website_status": website_status,
        "seo_notes": seo_notes or "",
        "facebook_url": facebook_url,
        "instagram_url": instagram_url,
        "email": email,
        "rating": rating,
        "reviews_count": reviews_count,
        "language_mismatch": language_mismatch,
    }
    gaps = []
    for gap_id, condition, label, service, urgency in GAP_CATALOG:
        try:
            if condition(ctx):
                gaps.append({"id": gap_id, "label": label, "service": service, "urgency": urgency})
        except Exception:
            pass
    return gaps
