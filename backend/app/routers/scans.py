"""Disease scan results from the offline scanner.

The model runs on the phone; only the RESULT (crop, disease, confidence, rounded location) is synced here.
Batch + `client_id` make offline sync idempotent (re-sending the queue never duplicates).
Scans are the raw input for the Village Disease Radar (Phase 6).
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Scan, User
from ..security import get_current_user, resolve_farmer

router = APIRouter(prefix="/api/scans", tags=["scans"])

MIN_CONFIDENCE = 0.5          # only confident scans are stored (blurry/unsure ones are not results)
GRID = 0.01                   # ~1.1 km privacy grid


def to_grid(value: float | None) -> float | None:
    return None if value is None else round(round(value / GRID) * GRID, 4)


class ScanIn(BaseModel):
    client_id: str = Field(min_length=8, max_length=64)
    crop: str = Field(max_length=40)
    disease: str = Field(max_length=80)          # model label, e.g. "Potato___Late_blight"
    confidence: float = Field(ge=0, le=1)
    scanned_at: datetime | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)   # optional override; else farm location
    longitude: float | None = Field(default=None, ge=-180, le=180)
    shared: bool = True


class ScanBatchIn(BaseModel):
    scans: list[ScanIn] = Field(max_length=200)


def _out(s: Scan) -> dict:
    return {
        "id": s.id, "client_id": s.client_id, "crop": s.crop, "disease": s.disease,
        "confidence": s.confidence, "healthy": s.disease.endswith("healthy"), "shared": s.shared,
        "scanned_at": s.scanned_at.isoformat(), "lat_grid": s.lat_grid, "lon_grid": s.lon_grid,
    }


@router.post("/sync")
def sync_scans(body: ScanBatchIn, farmer_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farmer = resolve_farmer(db, user, farmer_id, need_edit=user.role == "helper")
    farm = farmer.farm
    ids = [s.client_id for s in body.scans]
    existing = set(db.scalars(select(Scan.client_id).where(Scan.client_id.in_(ids)))) if ids else set()
    created, skipped = [], 0
    now = datetime.now(timezone.utc)
    for s in body.scans:
        if s.client_id in existing or s.confidence < MIN_CONFIDENCE:
            skipped += 1
            continue
        lat = s.latitude if s.latitude is not None else (farm.latitude if farm else None)
        lon = s.longitude if s.longitude is not None else (farm.longitude if farm else None)
        when = s.scanned_at or now
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        scan = Scan(
            client_id=s.client_id, farmer_id=farmer.id, crop=s.crop.lower(), disease=s.disease,
            confidence=round(s.confidence, 4), lat_grid=to_grid(lat), lon_grid=to_grid(lon),
            shared=s.shared, scanned_at=min(when, now),
        )
        db.add(scan)
        existing.add(s.client_id)
        created.append(scan)
    db.commit()
    return {"saved": len(created), "skipped": skipped, "client_ids": [c.client_id for c in created]}


@router.get("")
def list_scans(farmer_id: int | None = None, limit: int = 50, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farmer = resolve_farmer(db, user, farmer_id)
    rows = db.scalars(
        select(Scan).where(Scan.farmer_id == farmer.id).order_by(Scan.scanned_at.desc()).limit(min(limit, 200))
    ).all()
    return [_out(s) for s in rows]


@router.delete("/{scan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scan(scan_id: int, farmer_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Farmer can remove a wrong result (it then no longer counts for the Radar)."""
    farmer = resolve_farmer(db, user, farmer_id, need_edit=True)
    scan = db.get(Scan, scan_id)
    if scan is None or scan.farmer_id != farmer.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Scan not found")
    db.delete(scan)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
