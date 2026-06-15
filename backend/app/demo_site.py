"""Generador de sitios web demo para leads sin website.

Crea un index.html autocontenido (una sola pagina) a partir de una plantilla
Jinja2 y los datos del lead, y lo escribe en docs/demos/<slug>/index.html en
la raiz del repo para que pueda publicarse via GitHub Pages.
"""

import re
import unicodedata
from pathlib import Path
from urllib.parse import quote

from jinja2 import Environment, FileSystemLoader

APP_DIR = Path(__file__).resolve().parent
REPO_ROOT = APP_DIR.parent.parent
DEMOS_DIR = REPO_ROOT / "docs" / "demos"

_env = Environment(loader=FileSystemLoader(str(APP_DIR)), autoescape=True)

# Imagenes de Unsplash Source (sin necesidad de API key) por categoria.
# Cada categoria tiene: hero, about, gallery (5 imagenes) y una imagen por servicio.
CATEGORY_CONTENT = {
    "Legal": {
        "hero": "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1600&q=80",
        "about": "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=900&q=80",
        "gallery": [
            "https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=900&q=80",
            "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=600&q=80",
            "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80",
            "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80",
            "https://images.unsplash.com/photo-1423592707957-3b212afa6733?w=600&q=80",
        ],
        "services": [
            {"icon": "⚖️", "title": "Consultas legales", "description": "Asesoria personalizada para tu caso.", "image": "https://images.unsplash.com/photo-1593115057322-e94b77572f20?w=600&q=80"},
            {"icon": "📄", "title": "Tramites y documentos", "description": "Preparacion y revision de documentos legales.", "image": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80"},
            {"icon": "🤝", "title": "Representacion", "description": "Te acompañamos en todo el proceso.", "image": "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80"},
        ],
        "highlights": ["Mas de 10 años de experiencia", "Consulta inicial sin costo", "Atencion en español e ingles"],
    },
    "Salud": {
        "hero": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1600&q=80",
        "about": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=80",
        "gallery": [
            "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=900&q=80",
            "https://images.unsplash.com/photo-1581595219315-a187dd40c322?w=600&q=80",
            "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=600&q=80",
            "https://images.unsplash.com/photo-1666214280391-8ff5bd3c0bf0?w=600&q=80",
            "https://images.unsplash.com/photo-1551076805-e1869033e561?w=600&q=80",
        ],
        "services": [
            {"icon": "🩺", "title": "Consultas y diagnostico", "description": "Atencion profesional y personalizada.", "image": "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&q=80"},
            {"icon": "📅", "title": "Citas flexibles", "description": "Horarios que se adaptan a tu rutina.", "image": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&q=80"},
            {"icon": "💳", "title": "Planes de pago", "description": "Opciones de financiamiento disponibles.", "image": "https://images.unsplash.com/photo-1581056771107-24ca5f033842?w=600&q=80"},
        ],
        "highlights": ["Equipos modernos y certificados", "Personal con amplia experiencia", "Aceptamos seguros y planes de pago"],
    },
    "Belleza": {
        "hero": "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1600&q=80",
        "about": "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=900&q=80",
        "gallery": [
            "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=900&q=80",
            "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80",
            "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=600&q=80",
            "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80",
            "https://images.unsplash.com/photo-1519415510236-718bdfcd89c1?w=600&q=80",
        ],
        "services": [
            {"icon": "✂️", "title": "Cortes y estilos", "description": "Tendencias y servicios personalizados.", "image": "https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&q=80"},
            {"icon": "💆", "title": "Tratamientos", "description": "Cuidado profesional para ti.", "image": "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=600&q=80"},
            {"icon": "🎁", "title": "Paquetes y promociones", "description": "Combina servicios y ahorra.", "image": "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80"},
        ],
        "highlights": ["Productos de alta calidad", "Ambiente relajante y limpio", "Promociones para nuevos clientes"],
    },
    "Bienes raices": {
        "hero": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80",
        "about": "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=900&q=80",
        "gallery": [
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=900&q=80",
            "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=600&q=80",
            "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=600&q=80",
            "https://images.unsplash.com/photo-1599809275671-b5942cabc7a2?w=600&q=80",
            "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80",
        ],
        "services": [
            {"icon": "🏠", "title": "Compra y venta", "description": "Te ayudamos a encontrar tu proxima propiedad.", "image": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80"},
            {"icon": "📊", "title": "Avaluos", "description": "Conoce el valor real de tu propiedad.", "image": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80"},
            {"icon": "🔑", "title": "Administracion", "description": "Gestion integral de propiedades en renta.", "image": "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=600&q=80"},
        ],
        "highlights": ["Asesoria personalizada en cada paso", "Amplia cartera de propiedades", "Negociacion profesional"],
    },
    "Hogar y construccion": {
        "hero": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&q=80",
        "about": "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=900&q=80",
        "gallery": [
            "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=900&q=80",
            "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&q=80",
            "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80",
            "https://images.unsplash.com/photo-1556909212-d5b65c44e9bd?w=600&q=80",
            "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600&q=80",
        ],
        "services": [
            {"icon": "🔧", "title": "Reparaciones", "description": "Servicio rapido y garantizado.", "image": "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600&q=80"},
            {"icon": "📋", "title": "Presupuestos gratis", "description": "Cotizacion sin costo, sin compromiso.", "image": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80"},
            {"icon": "🚐", "title": "Servicio a domicilio", "description": "Vamos a tu casa o negocio.", "image": "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=600&q=80"},
        ],
        "highlights": ["Mano de obra garantizada", "Materiales de calidad", "Presupuesto claro desde el inicio"],
    },
    "Automotriz": {
        "hero": "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=1600&q=80",
        "about": "https://images.unsplash.com/photo-1493238792000-8113da705763?w=900&q=80",
        "gallery": [
            "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=80",
            "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?w=600&q=80",
            "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=600&q=80",
            "https://images.unsplash.com/photo-1518987048-93e29699e79a?w=600&q=80",
            "https://images.unsplash.com/photo-1632823469850-1b7b1e8b7af9?w=600&q=80",
        ],
        "services": [
            {"icon": "🚗", "title": "Diagnostico", "description": "Revision completa de tu vehiculo.", "image": "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=600&q=80"},
            {"icon": "🔩", "title": "Reparaciones", "description": "Repuestos de calidad y mano de obra garantizada.", "image": "https://images.unsplash.com/photo-1493238792000-8113da705763?w=600&q=80"},
            {"icon": "⏱️", "title": "Servicio rapido", "description": "Minimiza el tiempo sin tu vehiculo.", "image": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80"},
        ],
        "highlights": ["Tecnicos certificados", "Diagnostico computarizado", "Garantia en reparaciones"],
    },
    "Finanzas": {
        "hero": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1600&q=80",
        "about": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=900&q=80",
        "gallery": [
            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=900&q=80",
            "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80",
            "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80",
            "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80",
            "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80",
        ],
        "services": [
            {"icon": "📈", "title": "Asesoria financiera", "description": "Planeacion personalizada para tu negocio o familia.", "image": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80"},
            {"icon": "🧾", "title": "Impuestos", "description": "Declaraciones y cumplimiento al dia.", "image": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80"},
            {"icon": "📞", "title": "Consultas gratuitas", "description": "Primera consulta sin costo.", "image": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80"},
        ],
        "highlights": ["Atencion personalizada", "Confidencialidad garantizada", "Resultados comprobados"],
    },
}

DEFAULT_CONTENT = {
    "hero": "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1600&q=80",
    "about": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80",
    "gallery": [
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80",
        "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80",
        "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80",
        "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&q=80",
        "https://images.unsplash.com/photo-1556157382-97eda2d62296?w=600&q=80",
    ],
    "services": [
        {"icon": "⭐", "title": "Calidad garantizada", "description": "Trabajo profesional respaldado por nuestra experiencia.", "image": "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&q=80"},
        {"icon": "📅", "title": "Atencion rapida", "description": "Respondemos a la brevedad para agendar tu servicio.", "image": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80"},
        {"icon": "💬", "title": "Atencion personalizada", "description": "Te escuchamos para ofrecerte la mejor solucion.", "image": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80"},
    ],
    "highlights": ["Atencion profesional y de confianza", "Precios justos y transparentes", "Clientes satisfechos en toda la zona"],
}

TESTIMONIAL_POOL = [
    {"stars": 5, "name": "Maria G.", "text": "Excelente servicio, muy profesionales y atentos. Totalmente recomendados."},
    {"stars": 5, "name": "Carlos R.", "text": "Rapidos, honestos y de gran calidad. Volvere a contactarlos sin duda."},
    {"stars": 4, "name": "Ana P.", "text": "Buena atencion y resultados como esperaba. Gracias por su ayuda."},
]

PRIMARY_COLORS = [
    ("#2563eb", "#1d4ed8"),
    ("#0d9488", "#0f766e"),
    ("#7c3aed", "#6d28d9"),
    ("#dc2626", "#b91c1c"),
    ("#ea580c", "#c2410c"),
    ("#0284c7", "#0369a1"),
]


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "negocio"


def build_demo_html(lead, category: str = "") -> str:
    content = CATEGORY_CONTENT.get(category, DEFAULT_CONTENT)
    color_seed = sum(ord(c) for c in lead.business_name) if lead.business_name else 0
    primary_color, primary_color_dark = PRIMARY_COLORS[color_seed % len(PRIMARY_COLORS)]

    city = lead.city or ""
    tagline = (
        f"Atencion profesional y de confianza en {city}." if city else "Atencion profesional y de confianza."
    )
    about_text = (
        f"{lead.business_name} es un negocio local de {lead.niche} "
        f"{('en ' + city) if city else ''} comprometido con ofrecer un servicio de calidad "
        f"a cada uno de nuestros clientes. Contactanos hoy mismo para mas informacion."
    ).strip()

    whatsapp_number = re.sub(r"[^0-9]", "", lead.phone or "")

    if lead.lat and lead.lng:
        map_embed_url = f"https://maps.google.com/maps?q={lead.lat},{lead.lng}&z=15&output=embed"
    else:
        query = quote(f"{lead.business_name} {lead.address or city}")
        map_embed_url = f"https://maps.google.com/maps?q={query}&z=14&output=embed"

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
        highlights=content["highlights"],
        services=content["services"],
        hero_image=content["hero"],
        about_image=content["about"],
        gallery=content["gallery"],
        testimonials=TESTIMONIAL_POOL,
        map_embed_url=map_embed_url,
        primary_color=primary_color,
        primary_color_dark=primary_color_dark,
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
