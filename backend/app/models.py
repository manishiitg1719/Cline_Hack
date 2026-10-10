"""Database tables for FarmGuard."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(10))  # "farmer" | "helper"
    language: Mapped[str] = mapped_column(String(5), default="en")  # "en" | "hi"
    link_code: Mapped[str | None] = mapped_column(String(6), unique=True, nullable=True)  # farmers only
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    farm: Mapped["Farm | None"] = relationship(back_populates="owner", uselist=False, cascade="all, delete-orphan")


class Farm(Base):
    __tablename__ = "farms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    village: Mapped[str] = mapped_column(String(120), default="")
    district: Mapped[str] = mapped_column(String(120), default="")
    state: Mapped[str] = mapped_column(String(120), default="")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    area_acres: Mapped[float | None] = mapped_column(Float, nullable=True)
    soil_type: Mapped[str] = mapped_column(String(40), default="")
    water_source: Mapped[str] = mapped_column(String(20), default="")  # rain|canal|borewell|drip
    current_crop: Mapped[str] = mapped_column(String(60), default="")
    past_crops: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    owner: Mapped[User] = relationship(back_populates="farm")


class HelperLink(Base):
    """A relative (helper) linked to a farmer."""

    __tablename__ = "helper_links"
    __table_args__ = (UniqueConstraint("farmer_id", "helper_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    helper_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    relation: Mapped[str] = mapped_column(String(40), default="")
    can_edit: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    farmer: Mapped[User] = relationship(foreign_keys=[farmer_id])
    helper: Mapped[User] = relationship(foreign_keys=[helper_id])


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20))
    category: Mapped[str] = mapped_column(String(20), default="family")  # family|officer|supplier|other
    language: Mapped[str] = mapped_column(String(5), default="hi")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    kind: Mapped[str] = mapped_column(String(30))  # weather|irrigation|disease|radar|help|crop|reminder|custom
    template_id: Mapped[str] = mapped_column(String(60), default="")
    params: Mapped[dict] = mapped_column(JSON, default=dict)
    severity: Mapped[str] = mapped_column(String(10), default="info")  # info|warning|danger
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)



class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String(30))  # sowing|irrigation|spraying|fertilizer|harvest|other
    note: Mapped[str] = mapped_column(Text, default="")
    due_date: Mapped[str | None] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Scan(Base):
    """Disease scan result (used by the Disease Scanner and the Village Disease Radar)."""

    __tablename__ = "scans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)  # idempotent offline sync
    farmer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    crop: Mapped[str] = mapped_column(String(40))
    disease: Mapped[str] = mapped_column(String(80))
    confidence: Mapped[float] = mapped_column(Float)
    lat_grid: Mapped[float | None] = mapped_column(Float, nullable=True)  # rounded ~1 km for privacy
    lon_grid: Mapped[float | None] = mapped_column(Float, nullable=True)
    shared: Mapped[bool] = mapped_column(Boolean, default=True)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    scanned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Outbreak(Base):
    __tablename__ = "outbreaks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    crop: Mapped[str] = mapped_column(String(40))
    disease: Mapped[str] = mapped_column(String(80))
    center_lat: Mapped[float] = mapped_column(Float)
    center_lon: Mapped[float] = mapped_column(Float)
    radius_km: Mapped[float] = mapped_column(Float)
    farm_count: Mapped[int] = mapped_column(Integer)
    weather_risk: Mapped[str] = mapped_column(String(10))  # low|medium|high
    level: Mapped[str] = mapped_column(String(10))  # watch|warning|outbreak
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class WeatherCache(Base):
    """Last successful forecast per ~1 km grid cell (FALLBACK source when offline)."""

    __tablename__ = "weather_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    grid_key: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    payload: Mapped[dict] = mapped_column(JSON)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AlertLog(Base):
    """Prevents sending the same alert twice (one per farmer/alert/day)."""

    __tablename__ = "alert_log"
    __table_args__ = (UniqueConstraint("farmer_id", "alert_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    farmer_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    alert_key: Mapped[str] = mapped_column(String(80))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class ProviderUsage(Base):
    """Daily counter of paid/live API calls (credit guard)."""

    __tablename__ = "provider_usage"
    __table_args__ = (UniqueConstraint("provider", "day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider: Mapped[str] = mapped_column(String(30))
    day: Mapped[str] = mapped_column(String(10))  # YYYY-MM-DD
    calls: Mapped[int] = mapped_column(Integer, default=0)
