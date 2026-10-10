"""Register / login / profile."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Farm, User
from ..schemas import LanguageIn, LoginIn, RegisterIn, TokenOut, UserOut
from ..security import create_token, generate_link_code, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    if db.scalar(select(User.id).where(User.phone == body.phone)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Phone number already registered")
    user = User(
        name=body.name.strip(),
        phone=body.phone,
        password_hash=hash_password(body.password),
        role=body.role,
        language=body.language,
        link_code=generate_link_code(db) if body.role == "farmer" else None,
    )
    if body.role == "farmer":
        user.farm = Farm()
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(token=create_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.phone == body.phone))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong phone number or password")
    return TokenOut(token=create_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me/language", response_model=UserOut)
def set_language(body: LanguageIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.language = body.language
    db.commit()
    db.refresh(user)
    return user


@router.post("/me/link-code", response_model=UserOut)
def regenerate_link_code(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "farmer":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only farmers have a link code")
    user.link_code = generate_link_code(db)
    db.commit()
    db.refresh(user)
    return user
