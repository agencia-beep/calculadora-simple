"""Generador de sitios web demo para leads sin website.

Crea un index.html autocontenido (una sola pagina) a partir de una plantilla
Jinja2 y los datos del lead, y lo escribe en docs/demos/<slug>/index.html en
la raiz del repo para que pueda publicarse via GitHub Pages.
"""

import re
import unicodedata
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

APP_DIR = Path(__file__).resolve().parent
REPO_ROOT = APP_DIR.parent.parent
DEMOS_DIR = REPO_ROOT / "docs" / "demos"

_env = Environment(loader=FileSystemLoader(str(APP_DIR)), autoescape=True)

CATEGORY_SERVICES = {
    "Legal": [
        {"icon": "⚖️", "title": "Consultas legales", "description": "Asesoria personalizada para tu caso."},
        {"icon": "📄", "title": "Tramites y documentos", "description": "Preparacion y revision de documentos legales."},
        {"icon": "🤝", "title": "Representacion", "description": "Te acompañamos en todo el proceso."},
    ],
    "Salud": [
        {"icon": "🩺", "title": "Consultas y diagnostico", "description": "Atencion profesional y personalizada."},
        {"icon": "📅", "title": "Citas flexibles", "description": "Horarios que se adaptan a tu rutina."},
        {"icon": "💳", "title": "Planes de pago", "description": "Opciones de financiamiento disponibles."},
    ],
    "Belleza": [
        {"icon": "✂️", "title": "Cortes y estilos", "description": "Tendencias y servicios personalizados."},
        {"icon": "💆", "title": "Tratamientos", "description": "Cuidado profesional para ti."},
        {"icon": "🎁", "title": "Paquetes y promociones", "description": "Combina servicios y ahorra."},
    ],
    "Bienes raices": [
        {"icon": "🏠", "title": "Compra y venta", "description": "Te ayudamos a encontrar tu proxima propiedad."},
        {"icon": "📊", "title": "Avaluos", "description": "Conoce el valor real de tu propiedad."},
        {"icon": "🔑", "title": "Administracion", "description": "Gestion integral de propiedades en renta."},
    ],
    "Hogar y construccion": [
        {"icon": "🔧", "title": "Reparaciones", "description": "Servicio rapido y garantizado."},
        {"icon": "📋", "title": "Presupuestos gratis", "description": "Cotizacion sin costo, sin compromiso."},
        {"icon": "🚐", "title": "Servicio a domicilio", "description": "Vamos a tu casa o negocio."},
    ],
    "Automotriz": [
        {"icon": "🚗", "title": "Diagnostico", "description": "Revision completa de tu vehiculo."},
        {"icon": "🔩", "title": "Reparaciones", "description": "Repuestos de calidad y mano de obra garantizada."},
        {"icon": "⏱️", "title": "Servicio rapido", "description": "Minimiza el tiempo sin tu vehiculo."},
    ],
    "Finanzas": [
        {"icon": "📈", "title": "Asesoria financiera", "description": "Planeacion personalizada para tu negocio o familia."},
        {"icon": "🧾", "title": "Impuestos", "description": "Declaraciones y cumplimiento al dia."},
        {"icon": "📞", "title": "Consultas gratuitas", "description": "Primera consulta sin costo."},
    ],
}

DEFAULT_SERVICES = [
    {"icon": "⭐", "title": "Calidad garantizada", "description": "Trabajo profesional respaldado por nuestra experiencia."},
    {"icon": "📅", "title": "Atencion rapida", "description": "Respondemos a la brevedad para agendar tu servicio."},
    {"icon": "💬", "title": "Atencion personalizada", "description": "Te escuchamos para ofrecerte la mejor solucion."},
]

TAGLINES_ES = {
    "default": "Atencion profesional y de confianza en {city}.",
}

PRIMARY_COLORS = ["#2563eb", "#0d9488", "#7c3aed", "#dc2626", "#ea580c", "#0284c7"]


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "negocio"


def build_demo_html(lead, category: str = "") -> str:
    services = CATEGORY_SERVICES.get(category, DEFAULT_SERVICES)
    color_seed = sum(ord(c) for c in lead.business_name) if lead.business_name else 0
    primary_color = PRIMARY_COLORS[color_seed % len(PRIMARY_COLORS)]

    city = lead.city or ""
    tagline = TAGLINES_ES["default"].format(city=city) if city else "Atencion profesional y de confianza."
    about_text = (
        f"{lead.business_name} es un negocio local de {lead.niche} "
        f"{('en ' + city) if city else ''} comprometido con ofrecer un servicio de calidad "
        f"a cada uno de nuestros clientes. Contactanos hoy mismo para mas informacion."
    ).strip()

    whatsapp_number = re.sub(r"[^0-9]", "", lead.phone or "")

    template = _env.get_template("demo_template.html")
    return template.render(
        business_name=lead.business_name,
        niche=lead.niche,
        city=city,
        address=lead.address or city or "",
        phone=lead.phone or "",
        email=lead.email or "",
        whatsapp_number=whatsapp_number,
        rating=lead.rating,
        reviews_count=lead.reviews_count,
        tagline=tagline,
        about_text=about_text,
        services=services,
        primary_color=primary_color,
        lang="es",
        year=2026,
    )


def generate_demo_for_lead(lead, category: str = "") -> dict:
    """Genera el HTML y lo escribe en docs/demos/<slug>/index.html.

    Devuelve un dict con `slug` y `relative_path` (para construir la URL de
    GitHub Pages una vez se haga commit y push).
    """
    html = build_demo_html(lead, category=category)

    slug = slugify(lead.business_name)
    out_dir = DEMOS_DIR / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / "index.html"
    out_file.write_text(html, encoding="utf-8")

    return {
        "slug": slug,
        "relative_path": f"demos/{slug}/index.html",
        "file_path": str(out_file),
    }
