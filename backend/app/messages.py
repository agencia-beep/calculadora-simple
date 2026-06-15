"""Generacion de mensajes de prospeccion (WhatsApp, email, guion de llamada, diagnostico).

Por defecto usa plantillas. Si ANTHROPIC_API_KEY esta configurada, usa Claude
para redactar versiones personalizadas.
"""

import os

import httpx

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-sonnet-4-5"


def _website_phrase(website_status: str) -> str:
    return {
        "sin_website": "no cuentan actualmente con un sitio web",
        "solo_red_social": "solo cuentan con redes sociales como presencia online, sin un sitio web propio",
        "website_deficiente": "su sitio web actual parece tener problemas para cargar",
        "tiene_website": "ya tienen un sitio web",
    }.get(website_status, "su presencia digital podria mejorar")


def template_whatsapp(business_name: str, niche: str, city: str, website_status: str) -> str:
    return (
        f"Hola! 👋 Vi que *{business_name}* tiene muy buenas reseñas en Google "
        f"como negocio de {niche} en {city}, pero noté que {_website_phrase(website_status)}. "
        f"Ayudo a negocios locales a conseguir más clientes con una página web profesional "
        f"(rápida, optimizada para celular y para que te encuentren en Google). "
        f"¿Te interesaría ver un ejemplo gratis de cómo podría verse la tuya?"
    )


def template_email(business_name: str, niche: str, city: str, website_status: str) -> tuple[str, str]:
    subject = f"Una idea rápida para {business_name}"
    body = (
        f"Hola equipo de {business_name},\n\n"
        f"Mi nombre es [Tu Nombre] y ayudo a negocios de {niche} en {city} a atraer más clientes a través de internet.\n\n"
        f"Estuve revisando su presencia en Google y noté que {_website_phrase(website_status)}. "
        f"Hoy en día la mayoría de clientes buscan en Google antes de visitar un negocio, "
        f"y no tener un sitio web optimizado puede significar perder clientes frente a la competencia.\n\n"
        f"Me encantaría mostrarles, sin ningún compromiso, una propuesta de cómo podría verse "
        f"su página web y cómo ayudaría a conseguir más reservas/clientes.\n\n"
        f"¿Tendrían 15 minutos esta semana para una breve llamada?\n\n"
        f"Saludos,\n[Tu Nombre]\n[Tu Agencia]\n[Tu Teléfono]"
    )
    return subject, body


def template_call_script(business_name: str, niche: str, city: str, website_status: str) -> str:
    return (
        f"Guion de llamada - {business_name}\n\n"
        f"1. Saludo: 'Hola, buenas tardes, hablo con {business_name}? Mi nombre es [Tu Nombre], "
        f"soy de [Tu Agencia], ayudamos a negocios de {niche} aqui en {city} a conseguir mas clientes por internet.'\n\n"
        f"2. Gancho: 'Le llamo porque estuve viendo su negocio en Google y note que {_website_phrase(website_status)}. "
        f"Hoy la mayoria de las personas buscan en Google antes de visitar un negocio.'\n\n"
        f"3. Propuesta de valor: 'Ayudamos a negocios como el suyo a tener una pagina web profesional "
        f"que atrae mas clientes, sin que tengan que preocuparse por la parte tecnica.'\n\n"
        f"4. Pregunta de descubrimiento: 'Cuentame, como estan consiguiendo clientes nuevos actualmente?'\n\n"
        f"5. Cierre: 'Me encantaria mostrarle un ejemplo gratuito de como podria verse su pagina. "
        f"Tiene 15 minutos esta semana para una breve llamada o reunion?'\n\n"
        f"Manejo de objeciones:\n"
        f"- 'No tengo presupuesto ahora': 'Entiendo perfectamente, le parece si le envio la propuesta "
        f"para que la revise cuando guste, sin compromiso?'\n"
        f"- 'Ya tengo alguien que me ayuda': 'Que bueno escuchar eso! De todas formas le puedo compartir "
        f"un analisis rapido gratuito de su presencia actual, por si le es util.'"
    )


def template_diagnosis(business_name: str, niche: str, city: str, website_status: str, rating, reviews_count) -> str:
    base = {
        "sin_website": f"{business_name} no tiene sitio web propio, perdiendo oportunidades de clientes que buscan en Google.",
        "solo_red_social": f"{business_name} depende solo de redes sociales, sin control total sobre su imagen ni SEO.",
        "website_deficiente": f"{business_name} tiene un sitio web que no carga o no funciona correctamente, dando mala impresion a posibles clientes.",
        "tiene_website": f"{business_name} ya tiene presencia web, se podria evaluar una mejora o rediseño.",
    }.get(website_status, f"{business_name} podria mejorar su presencia digital.")

    extra = ""
    if rating is not None and reviews_count is not None and reviews_count > 0:
        extra = f" Cuenta con {reviews_count} reseñas y {rating}★ de calificacion, una base solida para atraer mas clientes con una buena pagina web."

    return base + extra


async def _generate_with_claude(prompt: str) -> str | None:
    if not ANTHROPIC_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                ANTHROPIC_URL,
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": ANTHROPIC_MODEL,
                    "max_tokens": 600,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            data = resp.json()
            content = data.get("content", [])
            if content:
                return content[0].get("text")
    except Exception:
        return None

    return None


async def generate_all_messages(*, business_name: str, niche: str, city: str, website_status: str, rating, reviews_count) -> dict:
    whatsapp = template_whatsapp(business_name, niche, city, website_status)
    subject, email_body = template_email(business_name, niche, city, website_status)
    call_script = template_call_script(business_name, niche, city, website_status)
    diagnosis = template_diagnosis(business_name, niche, city, website_status, rating, reviews_count)

    if ANTHROPIC_API_KEY:
        prompt = (
            f"Eres un experto en prospeccion B2B para una agencia de marketing que vende paginas web.\n"
            f"Negocio: {business_name}\n"
            f"Nicho: {niche}\n"
            f"Ciudad: {city}\n"
            f"Estado del sitio web: {website_status}\n"
            f"Rating: {rating}, Reviews: {reviews_count}\n\n"
            f"Genera, en español, los siguientes 4 elementos separados por '---':\n"
            f"1) Un mensaje corto y casual de WhatsApp para ofrecer servicios de pagina web.\n"
            f"2) Un email frio (con 'Asunto:' en la primera linea, luego el cuerpo).\n"
            f"3) Un guion de llamada en frio breve.\n"
            f"4) Un diagnostico breve (2 frases) de su presencia digital.\n"
            f"No uses placeholders como [Tu Nombre], usa 'nuestro equipo' o un tono generico de agencia."
        )
        ai_text = await _generate_with_claude(prompt)
        if ai_text:
            sections = [s.strip() for s in ai_text.split("---")]
            if len(sections) >= 4:
                whatsapp, email_body, call_script, diagnosis = sections[:4]

    return {
        "whatsapp_message": whatsapp,
        "email_message": email_body,
        "call_script": call_script,
        "diagnosis": diagnosis,
    }
