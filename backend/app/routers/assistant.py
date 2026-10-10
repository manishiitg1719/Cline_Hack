"""Farming assistant chat API."""
from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..security import get_current_user, resolve_farmer
from ..services import assistant

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class Turn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=2000)


class AskIn(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    language: Literal["en", "hi"] | None = None
    history: list[Turn] = Field(default_factory=list, max_length=12)


@router.get("/intro")
def intro(language: Literal["en", "hi"] | None = None, user: User = Depends(get_current_user)):
    return assistant.intro(language or user.language)


@router.post("/ask")
def ask(body: AskIn, farmer_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farmer = resolve_farmer(db, user, farmer_id)
    lang = body.language or user.language or "en"
    return assistant.answer(db, farmer, body.message, lang, [t.model_dump() for t in body.history])
