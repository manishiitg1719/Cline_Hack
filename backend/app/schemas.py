"""Pydantic request/response schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Role = Literal["farmer", "helper"]
Lang = Literal["en", "hi"]
WaterSource = Literal["", "rain", "canal", "borewell", "drip"]


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(pattern=r"^\+?\d{10,15}$")
    password: str = Field(min_length=6, max_length=72)
    role: Role
    language: Lang = "hi"


class LoginIn(BaseModel):
    phone: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str
    role: Role
    language: Lang
    link_code: str | None = None


class TokenOut(BaseModel):
    token: str
    user: UserOut


class LanguageIn(BaseModel):
    language: Lang


class FarmIn(BaseModel):
    village: str = ""
    district: str = ""
    state: str = ""
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    area_acres: float | None = Field(default=None, ge=0, le=100000)
    soil_type: str = ""
    water_source: WaterSource = ""
    current_crop: str = ""
    past_crops: list[str] = []


class FarmOut(FarmIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    updated_at: datetime | None = None


class LinkIn(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")
    relation: str = Field(default="", max_length=40)


class LinkPermissionIn(BaseModel):
    can_edit: bool


class LinkedPerson(BaseModel):
    link_id: int
    user_id: int
    name: str
    phone: str
    language: Lang
    relation: str
    can_edit: bool


class ContactIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(pattern=r"^\+?\d{10,15}$")
    category: Literal["family", "officer", "supplier", "other"] = "family"
    language: Lang = "hi"


class ContactOut(ContactIn):
    model_config = ConfigDict(from_attributes=True)

    id: int


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    template_id: str
    params: dict
    severity: str
    is_read: bool
    created_at: datetime


class HelpRequestIn(BaseModel):
    issue: str = Field(default="app", max_length=40)
    note: str = Field(default="", max_length=300)
