"""Lista curada de nichos recomendados para prospeccion de una agencia de marketing.

Cada nicho incluye un termino de busqueda (en espanol, que Google Places
tambien matchea contra negocios en ingles), una etiqueta bilingue y la
categoria a la que pertenece. `high_value` marca los nichos de alto ticket
promedio usados por scoring.calculate_score.
"""

NICHE_PRESETS = [
    # Legal
    {"value": "abogado", "label_es": "Abogado (general)", "label_en": "Lawyer", "category": "Legal", "high_value": True},
    {"value": "abogado de inmigracion", "label_es": "Abogado de inmigracion", "label_en": "Immigration lawyer", "category": "Legal", "high_value": True},
    {"value": "abogado de accidentes", "label_es": "Abogado de accidentes / lesiones", "label_en": "Personal injury lawyer", "category": "Legal", "high_value": True},
    {"value": "abogado de familia", "label_es": "Abogado de familia / divorcios", "label_en": "Family law attorney", "category": "Legal", "high_value": True},
    {"value": "abogado de bancarrota", "label_es": "Abogado de bancarrota", "label_en": "Bankruptcy attorney", "category": "Legal", "high_value": True},
    {"value": "notaria", "label_es": "Notaria / servicios de inmigracion", "label_en": "Notary / immigration services", "category": "Legal", "high_value": True},

    # Salud y bienestar
    {"value": "dentista", "label_es": "Dentista", "label_en": "Dentist", "category": "Salud", "high_value": True},
    {"value": "ortodoncista", "label_es": "Ortodoncista", "label_en": "Orthodontist", "category": "Salud", "high_value": True},
    {"value": "clinica medica", "label_es": "Clinica medica / consultorio", "label_en": "Medical clinic", "category": "Salud", "high_value": True},
    {"value": "dermatologo", "label_es": "Dermatologo", "label_en": "Dermatologist", "category": "Salud", "high_value": True},
    {"value": "quiropractico", "label_es": "Quiropractico", "label_en": "Chiropractor", "category": "Salud", "high_value": True},
    {"value": "fisioterapia", "label_es": "Fisioterapia", "label_en": "Physical therapy", "category": "Salud", "high_value": True},
    {"value": "veterinaria", "label_es": "Veterinaria", "label_en": "Veterinary clinic", "category": "Salud", "high_value": True},
    {"value": "medspa", "label_es": "Medspa / spa medico", "label_en": "Medspa", "category": "Salud", "high_value": True},
    {"value": "psicologo", "label_es": "Psicologo / terapeuta", "label_en": "Psychologist / therapist", "category": "Salud", "high_value": True},

    # Belleza
    {"value": "salon de belleza", "label_es": "Salon de belleza", "label_en": "Beauty salon", "category": "Belleza", "high_value": False},
    {"value": "barberia", "label_es": "Barberia", "label_en": "Barbershop", "category": "Belleza", "high_value": False},
    {"value": "estudio de unas", "label_es": "Estudio de unas / nail salon", "label_en": "Nail salon", "category": "Belleza", "high_value": False},
    {"value": "spa", "label_es": "Spa / estetica", "label_en": "Spa", "category": "Belleza", "high_value": False},

    # Bienes raices
    {"value": "bienes raices", "label_es": "Agente / inmobiliaria", "label_en": "Real estate agency", "category": "Bienes raices", "high_value": True},
    {"value": "administracion de propiedades", "label_es": "Administradora de propiedades", "label_en": "Property management", "category": "Bienes raices", "high_value": True},

    # Hogar y construccion
    {"value": "contratista general", "label_es": "Contratista general", "label_en": "General contractor", "category": "Hogar y construccion", "high_value": True},
    {"value": "remodelacion", "label_es": "Remodelacion de casas", "label_en": "Home remodeling", "category": "Hogar y construccion", "high_value": True},
    {"value": "techos", "label_es": "Techos / roofing", "label_en": "Roofing company", "category": "Hogar y construccion", "high_value": True},
    {"value": "plomero", "label_es": "Plomero", "label_en": "Plumber", "category": "Hogar y construccion", "high_value": True},
    {"value": "electricista", "label_es": "Electricista", "label_en": "Electrician", "category": "Hogar y construccion", "high_value": True},
    {"value": "aire acondicionado", "label_es": "Aire acondicionado / HVAC", "label_en": "HVAC company", "category": "Hogar y construccion", "high_value": True},
    {"value": "paisajismo", "label_es": "Paisajismo / jardineria", "label_en": "Landscaping", "category": "Hogar y construccion", "high_value": False},
    {"value": "pintor", "label_es": "Pintor de casas", "label_en": "House painter", "category": "Hogar y construccion", "high_value": False},
    {"value": "pisos", "label_es": "Instalacion de pisos", "label_en": "Flooring company", "category": "Hogar y construccion", "high_value": False},
    {"value": "cercas", "label_es": "Cercas / fences", "label_en": "Fence company", "category": "Hogar y construccion", "high_value": False},
    {"value": "control de plagas", "label_es": "Control de plagas", "label_en": "Pest control", "category": "Hogar y construccion", "high_value": False},
    {"value": "mudanzas", "label_es": "Mudanzas", "label_en": "Moving company", "category": "Hogar y construccion", "high_value": False},
    {"value": "limpieza", "label_es": "Servicios de limpieza", "label_en": "Cleaning services", "category": "Hogar y construccion", "high_value": False},

    # Automotriz
    {"value": "taller mecanico", "label_es": "Taller mecanico", "label_en": "Auto repair shop", "category": "Automotriz", "high_value": False},
    {"value": "detailing de autos", "label_es": "Detailing de autos", "label_en": "Car detailing", "category": "Automotriz", "high_value": False},
    {"value": "taller de hojalateria", "label_es": "Taller de hojalateria y pintura", "label_en": "Auto body shop", "category": "Automotriz", "high_value": False},

    # Finanzas
    {"value": "contador", "label_es": "Contador / CPA", "label_en": "Accountant / CPA", "category": "Finanzas", "high_value": True},
    {"value": "preparacion de impuestos", "label_es": "Preparacion de impuestos", "label_en": "Tax preparation", "category": "Finanzas", "high_value": True},
    {"value": "asesor financiero", "label_es": "Asesor financiero", "label_en": "Financial advisor", "category": "Finanzas", "high_value": True},
    {"value": "agente de seguros", "label_es": "Agente de seguros", "label_en": "Insurance agency", "category": "Finanzas", "high_value": True},

    # Fitness
    {"value": "gimnasio", "label_es": "Gimnasio", "label_en": "Gym", "category": "Fitness", "high_value": False},
    {"value": "yoga", "label_es": "Estudio de yoga / pilates", "label_en": "Yoga / pilates studio", "category": "Fitness", "high_value": False},
    {"value": "entrenador personal", "label_es": "Entrenador personal", "label_en": "Personal trainer", "category": "Fitness", "high_value": False},

    # Eventos
    {"value": "fotografo", "label_es": "Fotografo", "label_en": "Photographer", "category": "Eventos", "high_value": False},
    {"value": "planificador de bodas", "label_es": "Planificador de bodas", "label_en": "Wedding planner", "category": "Eventos", "high_value": False},
    {"value": "salon de eventos", "label_es": "Salon de eventos", "label_en": "Event venue", "category": "Eventos", "high_value": False},
    {"value": "catering", "label_es": "Catering", "label_en": "Catering", "category": "Eventos", "high_value": False},

    # Educacion
    {"value": "academia", "label_es": "Academia / centro educativo", "label_en": "Educational academy", "category": "Educacion", "high_value": False},
    {"value": "guarderia", "label_es": "Guarderia / daycare", "label_en": "Daycare", "category": "Educacion", "high_value": False},
    {"value": "clases particulares", "label_es": "Clases particulares / tutorias", "label_en": "Tutoring", "category": "Educacion", "high_value": False},

    # Comunidad hispana
    {"value": "envios de dinero", "label_es": "Envios de dinero / remesas", "label_en": "Money transfer / remittances", "category": "Comunidad hispana", "high_value": True},
    {"value": "restaurante", "label_es": "Restaurante / taqueria", "label_en": "Restaurant / taqueria", "category": "Comunidad hispana", "high_value": False},
    {"value": "panaderia", "label_es": "Panaderia", "label_en": "Bakery", "category": "Comunidad hispana", "high_value": False},
    {"value": "mercado latino", "label_es": "Mercado / tienda latina", "label_en": "Latin market / grocery", "category": "Comunidad hispana", "high_value": False},
]


def get_grouped_niches() -> dict:
    """Devuelve los nichos agrupados por categoria, en el orden definido arriba."""
    grouped: dict[str, list[dict]] = {}
    for niche in NICHE_PRESETS:
        grouped.setdefault(niche["category"], []).append(
            {
                "value": niche["value"],
                "label_es": niche["label_es"],
                "label_en": niche["label_en"],
                "high_value": niche["high_value"],
            }
        )
    return grouped
