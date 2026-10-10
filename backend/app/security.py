"""Password hashing, JWT tokens and auth dependencies."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .models import HelperLink, User

ALGORITHM = "HS256"
_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def create_token(user_id: int) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.token_expire_hours)
    return jwt.encode({"sub": str(user_id), "exp": expire}, settings.secret_key, algorithm=ALGORITHM)


def generate_link_code(db: Session) -> str:
    """Unique 6-digit code a farmer shares with relatives."""
    while True:
        code = f"{secrets.randbelow(1_000_000):06d}"
        if not db.scalar(select(User.id).where(User.link_code == code)):
            return code


def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    if creds is None:
        raise unauthorized
    try:
        payload = jwt.decode(creds.credentials, get_settings().secret_key, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized from None
    user = db.get(User, user_id)
    if user is None:
        raise unauthorized
    return user


def resolve_farmer(db: Session, current: User, farmer_id: int | None, need_edit: bool = False) -> User:
    """Return the farmer the current user is acting for.

    Farmers act for themselves; helpers must pass `farmer_id` of a linked farmer.
    """
    if current.role == "farmer":
        if farmer_id not in (None, current.id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Farmers can only access their own farm")
        return current

    if farmer_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "farmer_id is required for helpers")
    link = db.scalar(
        select(HelperLink).where(HelperLink.farmer_id == farmer_id, HelperLink.helper_id == current.id)
    )
    if link is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not linked to this farmer")
    if need_edit and not link.can_edit:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "The farmer gave you view-only access")
    return link.farmer
