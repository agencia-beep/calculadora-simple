import os
import secrets

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from .database import get_db
from .models import Client

ADMIN_KEY = os.getenv("ADMIN_KEY", "")


def generate_token() -> str:
    return secrets.token_urlsafe(24)


def get_current_client(
    x_client_token: str | None = Header(default=None),
    token: str | None = None,
    db: Session = Depends(get_db),
) -> Client:
    effective_token = x_client_token or token
    if not effective_token:
        raise HTTPException(status_code=401, detail="Falta el token de cliente")

    client = db.query(Client).filter(Client.token == effective_token).first()
    if not client:
        raise HTTPException(status_code=401, detail="Token de cliente invalido")
    return client


def require_admin(x_admin_key: str | None = Header(default=None)) -> None:
    if not ADMIN_KEY or x_admin_key != ADMIN_KEY:
        raise HTTPException(status_code=403, detail="Admin key invalida")
