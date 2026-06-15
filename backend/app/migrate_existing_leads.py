"""Migracion de un solo uso: crea el cliente 'Agencia' y le asigna los leads existentes
que no tengan client_id (de versiones anteriores a multi-cliente).

Uso: python -m app.migrate_existing_leads
"""

from dotenv import load_dotenv

load_dotenv()

from .auth import generate_token
from .database import Base, SessionLocal, engine
from .models import Client, Lead

Base.metadata.create_all(bind=engine)


def main():
    db = SessionLocal()
    try:
        client = db.query(Client).filter(Client.name == "Agencia").first()
        if client is None:
            client = Client(name="Agencia", token=generate_token())
            db.add(client)
            db.commit()
            db.refresh(client)
            print(f"Cliente 'Agencia' creado. Token: {client.token}")
        else:
            print(f"Cliente 'Agencia' ya existe. Token: {client.token}")

        orphans = db.query(Lead).filter(Lead.client_id.is_(None)).all()
        for lead in orphans:
            lead.client_id = client.id
        db.commit()
        print(f"Leads reasignados: {len(orphans)}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
