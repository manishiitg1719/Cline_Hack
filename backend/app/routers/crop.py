"""Smart Crop Advisor API."""
from __future__ import annotations

import base64

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..providers import climate, llm, soil
from ..security import get_current_user, resolve_farmer
from ..services.crop_plan import build_plan

router = APIRouter(prefix="/api/crop", tags=["crop"])

Season = str  # "kharif" | "rabi" | "zaid"


class CardValues(BaseModel):
    """Soil Health Card values (all optional). N/P/K in kg/ha, OC in %."""
    ph: float | None = Field(default=None, ge=3, le=11)
    n: float | None = Field(default=None, ge=0, le=2000)
    p: float | None = Field(default=None, ge=0, le=500)
    k: float | None = Field(default=None, ge=0, le=3000)
    oc: float | None = Field(default=None, ge=0, le=10)
    ec: float | None = Field(default=None, ge=0, le=20)


class AdviceIn(BaseModel):
    season: str | None = Field(default=None, pattern="^(kharif|rabi|zaid)$")
    soil_type: str | None = None          # override farm profile (e.g. chosen in the wizard)
    last_crop: str | None = None
    water_source: str | None = None
    budget: str = Field(default="medium", pattern="^(low|medium|high)$")
    goal: str = Field(default="profit", pattern="^(profit|low_risk|low_water|improve_soil)$")
    card: CardValues | None = None


@router.post("/advice")
def crop_advice(body: AdviceIn, farmer_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    farmer = resolve_farmer(db, user, farmer_id)
    farm = farmer.farm
    if farm is None or farm.latitude is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Set your farm location first")

    season = body.season or climate.current_season()
    soil_type = body.soil_type if body.soil_type is not None else farm.soil_type
    sg = soil.get_soil(farm.latitude, farm.longitude, soil_type)
    cl = climate.get_season_climate(farm.latitude, farm.longitude, season)
    card = body.card.model_dump(exclude_none=True) if body.card else {}

    ph = card.get("ph", sg.data["ph"])
    effective_soil = soil_type or sg.data["texture_class"]
    last_crop = body.last_crop if body.last_crop is not None else (farm.past_crops[0] if farm.past_crops else farm.current_crop)
    ctx = {
        "season": season, "temperature": cl.data["temperature"], "rainfall": cl.data["rainfall"], "ph": ph,
        "soil_type": effective_soil, "water_source": body.water_source if body.water_source is not None else farm.water_source,
        "last_crop": last_crop or "", "budget": body.budget, "goal": body.goal, "area": farm.area_acres,
    }
    plan = build_plan(ctx, {**card, "ph": ph}, {"card": bool(card), "soil_mode": sg.mode})
    return {
        **plan,
        "inputs": {**ctx, "soil_source": "card" if "ph" in card else sg.source, "soil": sg.data, "climate": cl.data},
        "sources": {
            "soil": {"mode": sg.mode, "source": sg.source, "note": sg.note},
            "climate": {"mode": cl.mode, "source": cl.source, "note": cl.note},
        },
    }


CARD_PROMPT = (
    "You read Indian Soil Health Cards. Return ONLY JSON with numeric fields (null if not visible): "
    '{"ph":..,"ec":..,"oc":..,"n":..,"p":..,"k":..} where oc is organic carbon in %, n/p/k are available '
    "N, P, K in kg/ha. Do not guess values that are not printed."
)


@router.post("/read-card")
async def read_card(image: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """LIVE: AI vision reads the card. FALLBACK: tells the app to show the manual form."""
    data = await image.read()
    if len(data) > 6 * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Image too large (max 6 MB)")
    mime = image.content_type or "image/jpeg"
    if not mime.startswith("image/"):
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Please upload a photo")
    try:
        reply = llm.chat(db, [{"role": "user", "content": [
            {"type": "text", "text": CARD_PROMPT},
            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{base64.b64encode(data).decode()}"}},
        ]}], max_tokens=200)
        values = CardValues(**{k: v for k, v in llm.extract_json(reply).items() if k in CardValues.model_fields and v is not None})
        return {"mode": "live", "source": "AI vision", "values": values.model_dump(), "note": "Check every number before using it."}
    except llm.LLMUnavailable as exc:
        return {"mode": "fallback", "source": "Manual entry", "values": None, "note": f"{exc}. Please type the values from your card."}
    except (ValueError, TypeError):
        return {"mode": "fallback", "source": "Manual entry", "values": None, "note": "Could not read the card clearly. Please type the values."}
