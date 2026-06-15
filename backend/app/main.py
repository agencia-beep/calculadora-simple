import csv
import io
from datetime import datetime

from dotenv import load_dotenv

load_dotenv()

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from . import messages, places, scoring
from .auth import generate_token, get_current_client, require_admin
from .database import Base, engine, get_db
from .export_excel import build_excel
from .models import Client, Lead, SavedSearch
from .niche_presets import get_grouped_niches
from .schemas import (
    ClientCreate,
    ClientOut,
    ContactStatusUpdate,
    DashboardStats,
    LeadOut,
    SavedSearchCreate,
    SavedSearchOut,
    SearchRequest,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Local Web Lead Finder")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "google_places_configured": bool(places.GOOGLE_API_KEY)}


async def run_search(req: SearchRequest, client_id: int, db: Session) -> list[Lead]:
    if not req.zip_code and not req.city:
        raise HTTPException(status_code=400, detail="Debes indicar una ciudad o un codigo postal")

    try:
        lat, lng, formatted_address = await places.geocode_location(
            req.city or "", req.state or "", req.country, req.zip_code or ""
        )
        radius_meters = int(req.radius_km * 1000)
        raw_results = await places.nearby_search(
            lat, lng, radius_meters, req.niche, req.max_results, req.language
        )
    except places.PlacesConfigError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    city_for_leads = req.city or formatted_address or req.zip_code

    saved_leads: list[Lead] = []

    for item in raw_results:
        place_id = item.get("place_id")
        if not place_id:
            continue

        details = await places.get_place_details(place_id)
        if not details:
            details = item

        business_status = details.get("business_status") or item.get("business_status")
        if not scoring.is_prospect(business_status, ""):
            website_status_final = "no_prospecto"
        else:
            website = details.get("website")
            website_unreachable = False
            classified = scoring.classify_website(website, website_unreachable=False)

            if classified == "tiene_website":
                reachable = await places.check_website_reachable(website)
                if not reachable:
                    classified = scoring.classify_website(website, website_unreachable=True)

            website_status_final = classified

        email = None
        page_speed_ms = None
        seo_notes = ""
        if website and website_status_final in ("tiene_website", "website_deficiente"):
            analysis = await places.analyze_website(website)
            email = analysis["email"]
            page_speed_ms = analysis["load_time_ms"]
            seo_notes = analysis["seo_notes"]

        rating = details.get("rating") or item.get("rating")
        reviews_count = details.get("user_ratings_total") or item.get("user_ratings_total") or 0
        phone = details.get("formatted_phone_number") or details.get("international_phone_number")
        address = details.get("formatted_address") or item.get("vicinity")
        location = (details.get("geometry") or item.get("geometry") or {}).get("location", {})
        maps_url = details.get("url")
        website = details.get("website")
        category = ", ".join((details.get("types") or item.get("types") or [])[:3])

        score = 0
        priority = "Baja"
        diagnosis = ""

        if website_status_final != "no_prospecto":
            score = scoring.calculate_score(
                website_status=website_status_final,
                rating=rating,
                reviews_count=reviews_count,
                phone=phone,
                niche=req.niche,
                city=city_for_leads,
            )
            priority = scoring.priority_from_score(score)
            diagnosis = scoring.build_diagnosis(
                business_name=details.get("name") or item.get("name", ""),
                website_status=website_status_final,
                rating=rating,
                reviews_count=reviews_count,
            )

        lead = db.query(Lead).filter(Lead.client_id == client_id, Lead.place_id == place_id).first()
        if lead is None:
            lead = Lead(client_id=client_id, place_id=place_id)
            db.add(lead)

        lead.business_name = details.get("name") or item.get("name", "Sin nombre")
        lead.niche = req.niche
        lead.category = category
        lead.address = address
        lead.city = city_for_leads
        lead.state = req.state
        lead.country = req.country
        lead.phone = phone
        lead.email = email
        lead.website = website
        lead.page_speed_ms = page_speed_ms
        lead.seo_notes = seo_notes
        lead.rating = rating
        lead.reviews_count = reviews_count
        lead.maps_url = maps_url
        lead.business_status = business_status
        lead.lat = location.get("lat")
        lead.lng = location.get("lng")
        lead.website_status = website_status_final
        lead.score = score
        lead.priority = priority
        lead.diagnosis = diagnosis
        lead.updated_at = datetime.utcnow()
        if not lead.contact_status:
            lead.contact_status = "No contactado"

        saved_leads.append(lead)

    db.commit()
    for lead in saved_leads:
        db.refresh(lead)

    saved_leads.sort(key=lambda l: l.score, reverse=True)
    return saved_leads


@app.post("/api/search", response_model=list[LeadOut])
async def search_leads(req: SearchRequest, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    return await run_search(req, client.id, db)


@app.get("/api/leads", response_model=list[LeadOut])
def list_leads(since: str | None = None, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    leads = (
        db.query(Lead)
        .filter(Lead.client_id == client.id)
        .order_by(Lead.score.desc(), Lead.created_at.desc())
        .all()
    )

    if not since:
        return leads

    since_dt = datetime.fromisoformat(since)
    results = []
    for lead in leads:
        lead_out = LeadOut.model_validate(lead)
        lead_out.is_new = lead.created_at >= since_dt
        results.append(lead_out)
    return results


@app.get("/api/leads/{lead_id}", response_model=LeadOut)
def get_lead(lead_id: int, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.client_id == client.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    return lead


@app.patch("/api/leads/{lead_id}/contact-status", response_model=LeadOut)
def update_contact_status(
    lead_id: int,
    payload: ContactStatusUpdate,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.client_id == client.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    lead.contact_status = payload.contact_status
    lead.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(lead)
    return lead


@app.post("/api/leads/{lead_id}/messages", response_model=LeadOut)
async def generate_messages(lead_id: int, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.client_id == client.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")

    generated = await messages.generate_all_messages(
        business_name=lead.business_name,
        niche=lead.niche,
        city=lead.city or "",
        website_status=lead.website_status or "sin_website",
        rating=lead.rating,
        reviews_count=lead.reviews_count,
    )

    lead.whatsapp_message = generated["whatsapp_message"]
    lead.email_message = generated["email_message"]
    lead.call_script = generated["call_script"]
    lead.diagnosis = generated["diagnosis"]
    lead.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(lead)
    return lead


@app.delete("/api/leads/{lead_id}")
def delete_lead(lead_id: int, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.client_id == client.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead no encontrado")
    db.delete(lead)
    db.commit()
    return {"ok": True}


@app.get("/api/dashboard", response_model=DashboardStats)
def dashboard(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    leads = db.query(Lead).filter(Lead.client_id == client.id).all()

    return DashboardStats(
        total_leads=len(leads),
        sin_website=sum(1 for l in leads if l.website_status == "sin_website"),
        website_debil=sum(1 for l in leads if l.website_status in ("solo_red_social", "website_deficiente")),
        leads_calientes=sum(1 for l in leads if l.priority == "Alta"),
        contactados=sum(1 for l in leads if l.contact_status != "No contactado"),
        reuniones=sum(1 for l in leads if l.contact_status == "Reunion agendada"),
        cerrados=sum(1 for l in leads if l.contact_status == "Cerrado"),
    )


@app.get("/api/niches")
def list_niches():
    return get_grouped_niches()


@app.get("/api/export/xlsx")
def export_xlsx(
    niche: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    query = db.query(Lead).filter(Lead.client_id == client.id)
    if niche:
        query = query.filter(Lead.niche == niche)
    if date_from:
        query = query.filter(Lead.created_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(Lead.created_at <= datetime.fromisoformat(date_to))

    leads = query.order_by(Lead.niche, Lead.created_at.desc()).all()
    workbook_bytes = build_excel(leads)

    filename = f"leads_{datetime.utcnow().strftime('%Y-%m-%d')}.xlsx"
    return StreamingResponse(
        io.BytesIO(workbook_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.get("/api/export/csv")
def export_csv(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    leads = db.query(Lead).filter(Lead.client_id == client.id).order_by(Lead.score.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Nombre", "Nicho", "Categoria", "Direccion", "Ciudad", "Estado", "Pais",
        "Telefono", "Email", "Website", "Rating", "Reviews", "Maps URL", "Estado Negocio",
        "Lat", "Lng", "Place ID", "Estado Website", "Velocidad (ms)", "SEO",
        "Score", "Prioridad", "Diagnostico", "Estado de Contacto",
    ])

    for lead in leads:
        writer.writerow([
            lead.business_name, lead.niche, lead.category, lead.address, lead.city,
            lead.state, lead.country, lead.phone, lead.email, lead.website, lead.rating,
            lead.reviews_count, lead.maps_url, lead.business_status, lead.lat,
            lead.lng, lead.place_id, lead.website_status, lead.page_speed_ms, lead.seo_notes,
            lead.score, lead.priority, lead.diagnosis, lead.contact_status,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=leads.csv"},
    )


@app.post("/api/admin/clients", response_model=ClientOut, dependencies=[Depends(require_admin)])
def create_client(payload: ClientCreate, db: Session = Depends(get_db)):
    client = Client(name=payload.name, token=generate_token())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@app.get("/api/admin/clients", response_model=list[ClientOut], dependencies=[Depends(require_admin)])
def list_clients(db: Session = Depends(get_db)):
    return db.query(Client).order_by(Client.created_at.desc()).all()


@app.get("/api/saved-searches", response_model=list[SavedSearchOut])
def list_saved_searches(client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    return db.query(SavedSearch).filter(SavedSearch.client_id == client.id).order_by(SavedSearch.created_at.desc()).all()


@app.post("/api/saved-searches", response_model=SavedSearchOut)
def create_saved_search(
    payload: SavedSearchCreate,
    client: Client = Depends(get_current_client),
    db: Session = Depends(get_db),
):
    saved = SavedSearch(client_id=client.id, **payload.model_dump())
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return saved


@app.delete("/api/saved-searches/{saved_id}")
def delete_saved_search(saved_id: int, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    saved = db.query(SavedSearch).filter(SavedSearch.id == saved_id, SavedSearch.client_id == client.id).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Busqueda guardada no encontrada")
    db.delete(saved)
    db.commit()
    return {"ok": True}


@app.post("/api/saved-searches/{saved_id}/run", response_model=list[LeadOut])
async def run_saved_search(saved_id: int, client: Client = Depends(get_current_client), db: Session = Depends(get_db)):
    saved = db.query(SavedSearch).filter(SavedSearch.id == saved_id, SavedSearch.client_id == client.id).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Busqueda guardada no encontrada")

    req = SearchRequest(
        niche=saved.niche,
        city=saved.city or "",
        state=saved.state or "",
        country=saved.country,
        zip_code=saved.zip_code or "",
        language=saved.language or "es",
        radius_km=saved.radius_km,
        max_results=saved.max_results,
    )

    leads = await run_search(req, client.id, db)

    saved.last_run_at = datetime.utcnow()
    db.commit()

    return leads
