from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint

from .database import Base


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), index=True, nullable=False)

    name = Column(String, nullable=False)
    niche = Column(String, nullable=False)
    city = Column(String)
    state = Column(String)
    country = Column(String, nullable=False)
    zip_code = Column(String)
    language = Column(String, default="es")
    radius_miles = Column(Float, default=3)
    max_results = Column(Integer, default=20)

    created_at = Column(DateTime, default=datetime.utcnow)
    last_run_at = Column(DateTime)


class Lead(Base):
    __tablename__ = "leads"
    __table_args__ = (UniqueConstraint("client_id", "place_id", name="uq_client_place"),)

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), index=True, nullable=False)
    place_id = Column(String, index=True)

    business_name = Column(String, nullable=False)
    niche = Column(String, nullable=False)
    category = Column(String)

    address = Column(String)
    city = Column(String)
    state = Column(String)
    country = Column(String)

    phone = Column(String)
    email = Column(String)
    website = Column(String)
    page_speed_ms = Column(Integer)
    seo_notes = Column(Text)
    rating = Column(Float)
    reviews_count = Column(Integer, default=0)
    maps_url = Column(String)
    business_status = Column(String)

    lat = Column(Float)
    lng = Column(Float)

    website_status = Column(String)  # sin_website | tiene_website | solo_red_social | website_deficiente | no_prospecto
    score = Column(Integer, default=0)
    priority = Column(String)  # Alta | Media | Baja
    diagnosis = Column(Text)

    contact_status = Column(String, default="No contactado")
    # No contactado | Contactado | Reunion agendada | Cerrado | Descartado

    whatsapp_message = Column(Text)
    email_message = Column(Text)
    call_script = Column(Text)
    demo_slug = Column(String)

    next_follow_up = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LeadNote(Base):
    __tablename__ = "lead_notes"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), index=True, nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class LeadActivity(Base):
    __tablename__ = "lead_activities"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), index=True, nullable=False)
    activity_type = Column(String, nullable=False)
    # created | status_change | note_added | follow_up_set | demo_generated | messages_generated
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Sequence(Base):
    __tablename__ = "sequences"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class SequenceStep(Base):
    __tablename__ = "sequence_steps"

    id = Column(Integer, primary_key=True, index=True)
    sequence_id = Column(Integer, ForeignKey("sequences.id"), index=True, nullable=False)
    step_number = Column(Integer, nullable=False)
    day_offset = Column(Integer, nullable=False)  # days after enrollment (or after previous step)
    action_type = Column(String, nullable=False)  # whatsapp | email | call | note
    message_template = Column(Text)  # optional custom message


class SequenceEnrollment(Base):
    __tablename__ = "sequence_enrollments"

    id = Column(Integer, primary_key=True, index=True)
    sequence_id = Column(Integer, ForeignKey("sequences.id"), index=True, nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"), index=True, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), index=True, nullable=False)
    current_step = Column(Integer, default=1)
    status = Column(String, default="active")  # active | paused | completed | stopped
    enrolled_at = Column(DateTime, default=datetime.utcnow)
    next_action_at = Column(DateTime, nullable=True)
