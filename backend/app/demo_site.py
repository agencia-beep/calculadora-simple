"""Generador de sitios web demo para leads sin website.

Crea un index.html autocontenido (una sola pagina) a partir de una plantilla
Jinja2 y los datos del lead, y lo escribe en docs/demos/<slug>/index.html en
la raiz del repo para que pueda publicarse via GitHub Pages.

Las imagenes, colores y textos se eligen segun el NICHO especifico del lead
(con fallback a la categoria y luego a un set generico), para que la demo se
vea relevante al tipo de negocio.
"""

import re
import subprocess
import unicodedata
from pathlib import Path
from urllib.parse import quote

from jinja2 import Environment, FileSystemLoader

APP_DIR = Path(__file__).resolve().parent
REPO_ROOT = APP_DIR.parent.parent
DEMOS_DIR = REPO_ROOT / "docs" / "demos"

PUBLIC_BASE_URL = "https://agencia-beep.github.io/calculadora-simple"

_env = Environment(loader=FileSystemLoader(str(APP_DIR)), autoescape=True)


def _img(photo_id: str, w: int = 600) -> str:
    return f"https://images.unsplash.com/photo-{photo_id}?w={w}&q=75&auto=format&fit=crop"


# Banco de fotos verificadas (Unsplash), agrupadas por tema visual.
THEMES = {
    "dental1": "1629909613654-28e377c37b09",
    "dental2": "1606811841689-23dfddce3e95",
    "dental3": "1588776814546-1ffcf47267a5",
    "doctor1": "1559757148-5c350d0d3c56",
    "doctor2": "1576091160550-2173dba999ef",
    "doctor3": "1581595219315-a187dd40c322",
    "office1": "1450101499163-c8848c66ca85",
    "office2": "1556157382-97eda2d62296",
    "lawbooks": "1521791136064-7986c2920216",
    "lawyer_hero": "1521587760476-6c12a4b040da",
    "handshake": "1431540015161-0bf868a2d407",
    "salon1": "1562322140-8baeececf3df",
    "nails": "1487412947147-5cebf100ffc2",
    "barber": "1560066984-138dadb4c035",
    "spa1": "1633681926022-84c23e8cb2d6",
    "spa2": "1540555700478-4be289fbecef",
    "beauty_hero": "1521590832167-7bcbfaa6381f",
    "house1": "1560518883-ce09059eeffa",
    "livingroom": "1564013799919-ab600027ffc6",
    "kitchen": "1582268611958-ebfd161ef9cf",
    "house2": "1560185007-cde436f6a4d0",
    "house3": "1576941089067-2de3c901e126",
    "house4": "1599809275671-b5942cabc7a2",
    "house5": "1503387762-592deb58ef4e",
    "construction_hero": "1581578731548-c64695cc6952",
    "tools": "1504148455328-c376907d081c",
    "plumber": "1581092918056-0c4c3acd3789",
    "renovation": "1581092580497-e0d23cbdf1dc",
    "cleaning1": "1600618528240-fb9fc964b853",
    "cleaning2": "1572981779307-38b8cabb2407",
    "garage_hero": "1486262715619-67b85e0b08d3",
    "garage1": "1503376780353-7e6692767b70",
    "mechanic1": "1487754180451-c456f719a1fc",
    "mechanic2": "1493238792000-8113da705763",
    "tires": "1517524008697-84bbe3c3fd98",
    "car_interior": "1518987048-93e29699e79a",
    "finance_hero": "1454165804606-c3d57bc86b40",
    "accounting": "1554224155-6726b3ff858f",
    "meeting": "1551288049-bebda4e38f71",
    "calculator": "1556742049-0cfed4f6a45d",
    "gym1": "1534438327276-14e5300c3a48",
    "gym2": "1517836357463-d25dfeac3438",
    "yoga1": "1571019613454-1cb2f99b2d8b",
    "restaurant1": "1517248135467-4c7edcad34c4",
    "food1": "1414235077428-338989a2e8c0",
    "bakery1": "1555396273-367ea4eb4db5",
    "bakery2": "1556910103-1c02745aae4d",
    "wedding1": "1511795409834-ef04bbd61622",
    "wedding2": "1519741497674-611481863552",
    "classroom1": "1503676260728-1c00da094a0b",
    "daycare1": "1503454537195-1dcabb73ffb9",
    "market1": "1556740758-90de374c12ad",
    "veterinary1": "1542838132-92c53300491e",
    "veterinary2": "1601758228041-f3b2795255f1",
    "pestcontrol1": "1532938911079-1b06ac7ceec7",
    "moving1": "1600880292203-757bb62b4baf",
    "painter1": "1558618666-fcd25c85cd64",
    "flooring1": "1610465299996-30f240ac2b1c",
    "fence1": "1601581875309-fafbf2d3ed3a",
    "ac1": "1605152276897-4f618f831968",
}


def _set(hero, about, gallery, services):
    return {"hero": hero, "about": about, "gallery": gallery, "services": services}


# Set de imagenes por nicho especifico (se intenta primero).
NICHE_IMAGES = {
    "dentista": _set("dental1", "dental2", ["dental3", "doctor1", "office2", "doctor2", "dental1"], ["dental2", "doctor3", "dental3"]),
    "ortodoncista": _set("dental2", "dental1", ["dental3", "dental1", "office2", "doctor2", "dental2"], ["dental1", "dental3", "doctor3"]),
    "clinica medica": _set("doctor2", "doctor1", ["doctor3", "dental1", "office2", "meeting", "doctor2"], ["doctor1", "doctor3", "office2"]),
    "dermatologo": _set("doctor2", "spa1", ["spa2", "doctor3", "office2", "doctor1", "spa1"], ["spa1", "doctor3", "spa2"]),
    "quiropractico": _set("doctor3", "gym1", ["doctor1", "gym1", "office2", "doctor2", "gym2"], ["doctor1", "gym1", "doctor3"]),
    "fisioterapia": _set("gym1", "doctor3", ["gym2", "doctor1", "office2", "doctor3", "gym1"], ["gym1", "doctor3", "gym2"]),
    "veterinaria": _set("veterinary1", "veterinary2", ["veterinary1", "veterinary2", "doctor1", "doctor3", "office2"], ["veterinary1", "veterinary2", "doctor1"]),
    "medspa": _set("spa1", "spa2", ["spa1", "spa2", "beauty_hero", "salon1", "nails"], ["spa1", "spa2", "beauty_hero"]),
    "psicologo": _set("office2", "meeting", ["office2", "meeting", "doctor3", "office1", "doctor1"], ["meeting", "office2", "doctor3"]),

    "abogado": _set("lawyer_hero", "lawbooks", ["office1", "handshake", "lawbooks", "office2", "meeting"], ["lawbooks", "handshake", "office1"]),
    "abogado de inmigracion": _set("lawyer_hero", "handshake", ["office1", "handshake", "lawbooks", "office2", "meeting"], ["handshake", "lawbooks", "office1"]),
    "abogado de accidentes": _set("lawyer_hero", "lawbooks", ["office1", "handshake", "lawbooks", "office2", "meeting"], ["lawbooks", "handshake", "office1"]),
    "abogado de familia": _set("lawyer_hero", "handshake", ["office1", "handshake", "lawbooks", "office2", "meeting"], ["handshake", "lawbooks", "office1"]),
    "abogado de bancarrota": _set("lawyer_hero", "lawbooks", ["office1", "handshake", "lawbooks", "office2", "meeting"], ["lawbooks", "handshake", "office1"]),
    "notaria": _set("office1", "handshake", ["office1", "handshake", "lawbooks", "office2", "meeting"], ["handshake", "office1", "lawbooks"]),

    "salon de belleza": _set("beauty_hero", "salon1", ["salon1", "nails", "barber", "beauty_hero", "spa1"], ["salon1", "nails", "spa1"]),
    "barberia": _set("barber", "salon1", ["barber", "salon1", "nails", "beauty_hero", "spa1"], ["barber", "salon1", "nails"]),
    "estudio de unas": _set("nails", "beauty_hero", ["nails", "salon1", "beauty_hero", "spa1", "spa2"], ["nails", "spa1", "salon1"]),
    "spa": _set("spa1", "spa2", ["spa1", "spa2", "beauty_hero", "salon1", "nails"], ["spa1", "spa2", "beauty_hero"]),

    "bienes raices": _set("house1", "livingroom", ["house1", "livingroom", "kitchen", "house2", "house3"], ["house1", "kitchen", "livingroom"]),
    "administracion de propiedades": _set("house2", "kitchen", ["house2", "house3", "house4", "house5", "livingroom"], ["house2", "kitchen", "house3"]),

    "contratista general": _set("construction_hero", "renovation", ["construction_hero", "renovation", "tools", "house3", "house4"], ["renovation", "tools", "construction_hero"]),
    "remodelacion": _set("renovation", "construction_hero", ["renovation", "construction_hero", "tools", "kitchen", "house4"], ["renovation", "kitchen", "tools"]),
    "techos": _set("construction_hero", "house2", ["construction_hero", "house2", "tools", "house3", "renovation"], ["construction_hero", "tools", "house2"]),
    "plomero": _set("plumber", "tools", ["plumber", "tools", "construction_hero", "house3", "renovation"], ["plumber", "tools", "renovation"]),
    "electricista": _set("tools", "construction_hero", ["tools", "construction_hero", "house3", "renovation", "house4"], ["tools", "construction_hero", "renovation"]),
    "aire acondicionado": _set("ac1", "tools", ["ac1", "construction_hero", "tools", "house3", "renovation"], ["ac1", "tools", "construction_hero"]),
    "paisajismo": _set("house5", "house3", ["house5", "house3", "house1", "house4", "construction_hero"], ["house5", "house3", "house1"]),
    "pintor": _set("painter1", "renovation", ["painter1", "renovation", "house3", "tools", "construction_hero"], ["painter1", "renovation", "house3"]),
    "pisos": _set("flooring1", "livingroom", ["flooring1", "livingroom", "renovation", "house3", "tools"], ["flooring1", "livingroom", "renovation"]),
    "cercas": _set("fence1", "house5", ["fence1", "house5", "construction_hero", "tools", "house3"], ["fence1", "house5", "construction_hero"]),
    "control de plagas": _set("pestcontrol1", "house2", ["pestcontrol1", "house2", "house3", "cleaning2", "tools"], ["pestcontrol1", "house2", "cleaning2"]),
    "mudanzas": _set("moving1", "house4", ["moving1", "house4", "house3", "tools", "house5"], ["moving1", "house4", "tools"]),
    "limpieza": _set("cleaning1", "cleaning2", ["cleaning1", "cleaning2", "livingroom", "kitchen", "house3"], ["cleaning1", "cleaning2", "kitchen"]),

    "taller mecanico": _set("garage_hero", "mechanic1", ["garage_hero", "mechanic1", "mechanic2", "tires", "car_interior"], ["mechanic1", "mechanic2", "tires"]),
    "detailing de autos": _set("car_interior", "garage1", ["car_interior", "garage1", "mechanic1", "tires", "garage_hero"], ["car_interior", "garage1", "tires"]),
    "taller de hojalateria": _set("garage1", "mechanic2", ["garage1", "mechanic2", "garage_hero", "tires", "car_interior"], ["mechanic2", "garage1", "tires"]),

    "contador": _set("finance_hero", "accounting", ["finance_hero", "accounting", "calculator", "meeting", "office1"], ["accounting", "calculator", "meeting"]),
    "preparacion de impuestos": _set("calculator", "accounting", ["finance_hero", "accounting", "calculator", "meeting", "office1"], ["calculator", "accounting", "meeting"]),
    "asesor financiero": _set("finance_hero", "meeting", ["finance_hero", "accounting", "calculator", "meeting", "office1"], ["meeting", "finance_hero", "accounting"]),
    "agente de seguros": _set("meeting", "handshake", ["finance_hero", "meeting", "handshake", "office1", "accounting"], ["meeting", "handshake", "accounting"]),

    "gimnasio": _set("gym1", "gym2", ["gym1", "gym2", "yoga1", "gym2", "gym1"], ["gym1", "gym2", "yoga1"]),
    "yoga": _set("yoga1", "gym2", ["yoga1", "gym1", "gym2", "spa1", "spa2"], ["yoga1", "gym2", "spa1"]),
    "entrenador personal": _set("gym2", "gym1", ["gym2", "gym1", "yoga1", "office2", "meeting"], ["gym2", "gym1", "yoga1"]),

    "fotografo": _set("wedding1", "wedding2", ["wedding1", "wedding2", "office2", "beauty_hero", "salon1"], ["wedding1", "wedding2", "beauty_hero"]),
    "planificador de bodas": _set("wedding2", "wedding1", ["wedding2", "wedding1", "restaurant1", "food1", "bakery1"], ["wedding1", "wedding2", "restaurant1"]),
    "salon de eventos": _set("wedding1", "restaurant1", ["wedding1", "restaurant1", "wedding2", "bakery1", "food1"], ["wedding1", "restaurant1", "wedding2"]),
    "catering": _set("food1", "bakery1", ["food1", "bakery1", "bakery2", "restaurant1", "wedding1"], ["food1", "bakery1", "restaurant1"]),

    "academia": _set("classroom1", "daycare1", ["classroom1", "daycare1", "office2", "meeting", "office1"], ["classroom1", "daycare1", "meeting"]),
    "guarderia": _set("daycare1", "classroom1", ["daycare1", "classroom1", "office2", "meeting", "office1"], ["daycare1", "classroom1", "meeting"]),
    "clases particulares": _set("classroom1", "office2", ["classroom1", "daycare1", "office2", "meeting", "office1"], ["classroom1", "meeting", "office2"]),

    "envios de dinero": _set("market1", "finance_hero", ["market1", "finance_hero", "accounting", "office1", "meeting"], ["finance_hero", "accounting", "meeting"]),
    "restaurante": _set("restaurant1", "food1", ["restaurant1", "food1", "bakery1", "bakery2", "market1"], ["food1", "bakery1", "restaurant1"]),
    "panaderia": _set("bakery1", "bakery2", ["bakery1", "bakery2", "food1", "restaurant1", "market1"], ["bakery1", "bakery2", "food1"]),
    "mercado latino": _set("market1", "food1", ["market1", "food1", "bakery1", "restaurant1", "bakery2"], ["market1", "food1", "bakery1"]),
}

# Textos (servicios + highlights) por categoria, usados cuando el nicho no
# tiene un set propio o como base para los titulos/descripciones.
CATEGORY_TEXT = {
    "Legal": {
        "services": [
            {"icon": "⚖️", "title": "Consultas legales", "description": "Asesoria personalizada para tu caso."},
            {"icon": "📄", "title": "Tramites y documentos", "description": "Preparacion y revision de documentos legales."},
            {"icon": "🤝", "title": "Representacion", "description": "Te acompañamos en todo el proceso."},
        ],
        "highlights": ["Mas de 10 años de experiencia", "Consulta inicial sin costo", "Atencion en español e ingles"],
    },
    "Salud": {
        "services": [
            {"icon": "🩺", "title": "Consultas y diagnostico", "description": "Atencion profesional y personalizada."},
            {"icon": "📅", "title": "Citas flexibles", "description": "Horarios que se adaptan a tu rutina."},
            {"icon": "💳", "title": "Planes de pago", "description": "Opciones de financiamiento disponibles."},
        ],
        "highlights": ["Equipos modernos y certificados", "Personal con amplia experiencia", "Aceptamos seguros y planes de pago"],
    },
    "Belleza": {
        "services": [
            {"icon": "✂️", "title": "Cortes y estilos", "description": "Tendencias y servicios personalizados."},
            {"icon": "💆", "title": "Tratamientos", "description": "Cuidado profesional para ti."},
            {"icon": "🎁", "title": "Paquetes y promociones", "description": "Combina servicios y ahorra."},
        ],
        "highlights": ["Productos de alta calidad", "Ambiente relajante y limpio", "Promociones para nuevos clientes"],
    },
    "Bienes raices": {
        "services": [
            {"icon": "🏠", "title": "Compra y venta", "description": "Te ayudamos a encontrar tu proxima propiedad."},
            {"icon": "📊", "title": "Avaluos", "description": "Conoce el valor real de tu propiedad."},
            {"icon": "🔑", "title": "Administracion", "description": "Gestion integral de propiedades en renta."},
        ],
        "highlights": ["Asesoria personalizada en cada paso", "Amplia cartera de propiedades", "Negociacion profesional"],
    },
    "Hogar y construccion": {
        "services": [
            {"icon": "🔧", "title": "Reparaciones", "description": "Servicio rapido y garantizado."},
            {"icon": "📋", "title": "Presupuestos gratis", "description": "Cotizacion sin costo, sin compromiso."},
            {"icon": "🚐", "title": "Servicio a domicilio", "description": "Vamos a tu casa o negocio."},
        ],
        "highlights": ["Mano de obra garantizada", "Materiales de calidad", "Presupuesto claro desde el inicio"],
    },
    "Automotriz": {
        "services": [
            {"icon": "🚗", "title": "Diagnostico", "description": "Revision completa de tu vehiculo."},
            {"icon": "🔩", "title": "Reparaciones", "description": "Repuestos de calidad y mano de obra garantizada."},
            {"icon": "⏱️", "title": "Servicio rapido", "description": "Minimiza el tiempo sin tu vehiculo."},
        ],
        "highlights": ["Tecnicos certificados", "Diagnostico computarizado", "Garantia en reparaciones"],
    },
    "Finanzas": {
        "services": [
            {"icon": "📈", "title": "Asesoria financiera", "description": "Planeacion personalizada para tu negocio o familia."},
            {"icon": "🧾", "title": "Impuestos", "description": "Declaraciones y cumplimiento al dia."},
            {"icon": "📞", "title": "Consultas gratuitas", "description": "Primera consulta sin costo."},
        ],
        "highlights": ["Atencion personalizada", "Confidencialidad garantizada", "Resultados comprobados"],
    },
    "Fitness": {
        "services": [
            {"icon": "💪", "title": "Entrenamiento personalizado", "description": "Planes adaptados a tus objetivos."},
            {"icon": "🧘", "title": "Clases grupales", "description": "Horarios variados para toda la familia."},
            {"icon": "🥗", "title": "Asesoria nutricional", "description": "Acompañamiento integral para tus metas."},
        ],
        "highlights": ["Instructores certificados", "Instalaciones limpias y modernas", "Primera clase gratis"],
    },
    "Eventos": {
        "services": [
            {"icon": "🎉", "title": "Planeacion completa", "description": "Nos encargamos de cada detalle de tu evento."},
            {"icon": "📸", "title": "Cobertura profesional", "description": "Capturamos cada momento especial."},
            {"icon": "🍽️", "title": "Servicio personalizado", "description": "Opciones a tu medida para tu ocasion."},
        ],
        "highlights": ["Experiencia en eventos de toda escala", "Atencion cercana y profesional", "Paquetes flexibles"],
    },
    "Educacion": {
        "services": [
            {"icon": "📚", "title": "Programas personalizados", "description": "Adaptados al ritmo de cada estudiante."},
            {"icon": "👩‍🏫", "title": "Profesores calificados", "description": "Equipo con experiencia comprobada."},
            {"icon": "🕒", "title": "Horarios flexibles", "description": "Opciones para toda la familia."},
        ],
        "highlights": ["Ambiente seguro y acogedor", "Seguimiento cercano del progreso", "Inscripciones abiertas todo el año"],
    },
    "Comunidad hispana": {
        "services": [
            {"icon": "🛍️", "title": "Productos y servicios", "description": "Todo lo que necesitas en un solo lugar."},
            {"icon": "💵", "title": "Atencion rapida", "description": "Te atendemos en español sin complicaciones."},
            {"icon": "🤝", "title": "Confianza y cercania", "description": "Servicio honesto para nuestra comunidad."},
        ],
        "highlights": ["Atencion en español", "Precios justos", "Ubicacion accesible"],
    },
}

DEFAULT_TEXT = {
    "services": [
        {"icon": "⭐", "title": "Calidad garantizada", "description": "Trabajo profesional respaldado por nuestra experiencia."},
        {"icon": "📅", "title": "Atencion rapida", "description": "Respondemos a la brevedad para agendar tu servicio."},
        {"icon": "💬", "title": "Atencion personalizada", "description": "Te escuchamos para ofrecerte la mejor solucion."},
    ],
    "highlights": ["Atencion profesional y de confianza", "Precios justos y transparentes", "Clientes satisfechos en toda la zona"],
}

DEFAULT_IMAGES = _set("office2", "meeting", ["office1", "meeting", "handshake", "office2", "lawbooks"], ["office1", "meeting", "handshake"])

# Categoria -> set de imagenes generico (fallback si el nicho no tiene set propio).
CATEGORY_DEFAULT_IMAGES = {
    "Legal": NICHE_IMAGES["abogado"],
    "Salud": NICHE_IMAGES["clinica medica"],
    "Belleza": NICHE_IMAGES["salon de belleza"],
    "Bienes raices": NICHE_IMAGES["bienes raices"],
    "Hogar y construccion": NICHE_IMAGES["contratista general"],
    "Automotriz": NICHE_IMAGES["taller mecanico"],
    "Finanzas": NICHE_IMAGES["contador"],
    "Fitness": NICHE_IMAGES["gimnasio"],
    "Eventos": NICHE_IMAGES["salon de eventos"],
    "Educacion": NICHE_IMAGES["academia"],
    "Comunidad hispana": NICHE_IMAGES["restaurante"],
}

# Paleta blanca y limpia, con un color de acento por categoria acorde al nicho.
CATEGORY_COLORS = {
    "Legal": ("#1e3a8a", "#1e293b"),
    "Salud": ("#0d9488", "#0f766e"),
    "Belleza": ("#db2777", "#9d174d"),
    "Bienes raices": ("#059669", "#047857"),
    "Hogar y construccion": ("#ea580c", "#c2410c"),
    "Automotriz": ("#dc2626", "#991b1b"),
    "Finanzas": ("#16a34a", "#15803d"),
    "Fitness": ("#f97316", "#c2410c"),
    "Eventos": ("#7c3aed", "#6d28d9"),
    "Educacion": ("#2563eb", "#1d4ed8"),
    "Comunidad hispana": ("#f59e0b", "#b45309"),
}
DEFAULT_COLOR = ("#2563eb", "#1d4ed8")


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "negocio"


def build_demo_html(lead, category: str = "") -> str:
    niche_value = (lead.niche or "").strip().lower()
    images = NICHE_IMAGES.get(niche_value) or CATEGORY_DEFAULT_IMAGES.get(category) or DEFAULT_IMAGES
    text = CATEGORY_TEXT.get(category, DEFAULT_TEXT)
    primary_color, primary_color_dark = CATEGORY_COLORS.get(category, DEFAULT_COLOR)

    services = [
        {**svc, "image": _img(THEMES[images["services"][i]])}
        for i, svc in enumerate(text["services"])
    ]
    gallery = [_img(THEMES[name], w=900 if i == 0 else 600) for i, name in enumerate(images["gallery"])]

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
        highlights=text["highlights"],
        services=services,
        hero_image=_img(THEMES[images["hero"]], w=1600),
        about_image=_img(THEMES[images["about"]], w=900),
        gallery=gallery,
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

    relative_path = f"demos/{slug}/index.html"
    _publish_to_github_pages(out_file, slug)

    return {
        "slug": slug,
        "relative_path": relative_path,
        "file_path": str(out_file),
        "public_url": f"{PUBLIC_BASE_URL}/{relative_path}",
    }


def _publish_to_github_pages(out_file: Path, slug: str) -> None:
    """Hace commit y push del demo generado para que quede disponible en GitHub Pages.

    Falla en silencio (solo log) si git no esta disponible o no hay nada que
    commitear, para no romper la generacion del demo si la publicacion falla.
    """
    try:
        rel = str(out_file.relative_to(REPO_ROOT))
        subprocess.run(["git", "add", rel], cwd=REPO_ROOT, check=True, capture_output=True)
        status = subprocess.run(
            ["git", "diff", "--cached", "--quiet"], cwd=REPO_ROOT, capture_output=True
        )
        if status.returncode == 0:
            return  # no hay cambios que publicar

        subprocess.run(
            ["git", "commit", "-m", f"Demo: actualizar {slug}"],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
        )
        subprocess.run(["git", "push"], cwd=REPO_ROOT, check=True, capture_output=True)
    except Exception as exc:  # pragma: no cover - publicacion best-effort
        print(f"[demo_site] No se pudo publicar el demo en GitHub Pages: {exc}")
