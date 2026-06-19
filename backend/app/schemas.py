from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class SearchRequest(BaseModel):
    niche: str
    city: Optional[str] = ""
    state: Optional[str] = ""
    country: str
    zip_code: Optional[str] = ""
    language: str = "es"
    radius_miles: float = 3
    max_results: int = 20


class LeadOut(BaseModel):
    id: int
    place_id: Optional[str]
    business_name: str
    niche: str
    category: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    website: Optional[str]
    page_speed_ms: Optional[int]
    seo_notes: Optional[str]
    rating: Optional[float]
    reviews_count: Optional[int]
    maps_url: Optional[str]
    business_status: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    website_status: Optional[str]
    score: int
    priority: Optional[str]
    diagnosis: Optional[str]
    contact_status: str
    whatsapp_message: Optional[str]
    email_message: Optional[str]
    call_script: Optional[str]
    demo_slug: Optional[str]
    next_follow_up: Optional[datetime]
    created_at: datetime
    is_new: bool = False

    class Config:
        from_attributes = True


class ContactStatusUpdate(BaseModel):
    contact_status: str


class FollowUpUpdate(BaseModel):
    next_follow_up: Optional[datetime] = None


class LeadNoteCreate(BaseModel):
    text: str


class LeadNoteOut(BaseModel):
    id: int
    lead_id: int
    text: str
    created_at: datetime

    class Config:
        from_attributes = True


class LeadActivityOut(BaseModel):
    id: int
    lead_id: int
    activity_type: str
    description: str
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_leads: int
    sin_website: int
    website_debil: int
    leads_calientes: int
    contactados: int
    reuniones: int
    cerrados: int
    seguimientos_vencidos: int


class ClientCreate(BaseModel):
    name: str


class ClientOut(BaseModel):
    id: int
    name: str
    token: str
    created_at: datetime

    class Config:
        from_attributes = True


class SavedSearchCreate(BaseModel):
    name: str
    niche: str
    city: Optional[str] = ""
    state: Optional[str] = ""
    country: str
    zip_code: Optional[str] = ""
    language: str = "es"
    radius_miles: float = 3
    max_results: int = 20


class SavedSearchOut(SavedSearchCreate):
    id: int
    created_at: datetime
    last_run_at: Optional[datetime]

    class Config:
        from_attributes = True
