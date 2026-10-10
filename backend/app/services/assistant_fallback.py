"""Offline (FALLBACK) assistant: keyword/intent matching + answers built from the farmer's own data.
Never invents facts: either a curated EN/HI FAQ answer, a live farm-data answer, or "I don't know"."""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

from sqlalchemy.orm import Session

from ..models import Outbreak, User
from ..providers import weather as weather_provider
from . import irrigation, radar

SHARED = Path(__file__).resolve().parents[3] / "shared"
LEVEL_ORDER = {"outbreak": 0, "warning": 1, "watch": 2}
INTENT_LINK = {"irrigation": "/irrigation", "weather": "/weather", "disease_near": "/radar"}


@lru_cache
def load(folder: str, name: str) -> dict:
    return json.loads((SHARED / folder / f"{name}.json").read_text(encoding="utf-8"))


def strings(lang: str) -> dict:
    return load("assistant", f"faq_{'hi' if lang == 'hi' else 'en'}")


def match(text: str) -> tuple[str, str] | None:
    """Longest keyword wins. Returns ("intent", name) | ("faq", id) | None."""
    q = re.sub(r"\s+", " ", text.lower()).strip()
    cfg = load("assistant", "faq")
    best, best_len = None, 0
    candidates = [("intent", n, kws) for n, kws in cfg["intents"].items()] + [("faq", i["id"], i["kw"]) for i in cfg["faq"]]
    for kind, key, kws in candidates:
        for kw in kws:
            if kw in q and len(kw) > best_len:
                best, best_len = (kind, key), len(kw)
    return best


def farm_context(db: Session, farmer: User) -> dict:
    """Small factual snapshot of the farm (used by both FALLBACK and LIVE answers)."""
    farm = farmer.farm
    ctx: dict = {"crop": farm.current_crop if farm else "", "soil": farm.soil_type if farm else "",
                 "water_source": farm.water_source if farm else "",
                 "has_location": bool(farm and farm.latitude is not None)}
    if not ctx["has_location"]:
        return ctx
    wx = weather_provider.get_forecast(db, farm.latitude, farm.longitude)
    ctx["weather_mode"] = wx.mode
    if wx.data:
        ctx["weather"] = {"rain_prob_24h": wx.data["rain_prob_24h"],
                          "days": [{k: d[k] for k in ("date", "t_max", "t_min", "rain_prob", "rain_mm")} for d in wx.data["days"][:3]]}
        ctx["irrigation"] = irrigation.decide(wx.data, farm.current_crop, farm.soil_type, farm.water_source, farm.area_acres)
    near = []
    for o in db.query(Outbreak).filter(Outbreak.active.is_(True)).all():
        d = radar.haversine_km(farm.latitude, farm.longitude, o.center_lat, o.center_lon)
        if d <= o.radius_km + radar.ALERT_BUFFER_KM + 10:
            near.append({"disease": o.disease, "farms": o.farm_count, "dist": round(d, 1), "level": o.level, "demo": o.is_demo})
    ctx["outbreaks"] = sorted(near, key=lambda o: (LEVEL_ORDER[o["level"]], o["dist"]))
    return ctx


def _fmt(template: str, **kw) -> str:
    return template.format(**{k: ("–" if v is None else v) for k, v in kw.items()})


def dynamic_answer(intent: str, ctx: dict, lang: str) -> str:
    s = strings(lang)
    dyn = s["dynamic"]
    lang = "hi" if lang == "hi" else "en"
    if not ctx.get("has_location"):
        return s["need_location"]
    if intent == "irrigation" and ctx.get("irrigation"):
        ir = ctx["irrigation"]
        crop = load("messages", lang)["crops"].get(ctx["crop"]) or ctx["crop"] or "—"
        return _fmt(dyn["irrigation"], crop=crop, decision=dyn["decision"][ir["decision"]], available=ir["available_water_pct"],
                    rain=ir["rain_prob_24h"], need=ir["crop_need_today_mm"])
    if intent == "weather" and ctx.get("weather"):
        days = "; ".join(_fmt(dyn["weather_day"], date=d["date"][5:], tmax=round(d["t_max"]), tmin=round(d["t_min"]), rainp=d["rain_prob"])
                         for d in ctx["weather"]["days"])
        return _fmt(dyn["weather"], days=days, rain=ctx["weather"]["rain_prob_24h"])
    if intent == "disease_near":
        out = ctx.get("outbreaks") or []
        if not out:
            return dyn["disease_none"]
        o = out[0]
        name = load("disease", f"kb_{lang}")["classes"].get(o["disease"], {}).get("name", o["disease"])
        return _fmt(dyn["disease_near"], count=len(out), disease=name, farms=o["farms"], dist=o["dist"], level=dyn["level"][o["level"]])
    return s["no_match"]


def fallback_answer(text: str, ctx: dict, lang: str) -> dict:
    s = strings(lang)
    m = match(text)
    if m is None:
        return {"answer": s["no_match"], "matched": None, "link": None}
    kind, key = m
    if kind == "intent":
        return {"answer": dynamic_answer(key, ctx, lang), "matched": key, "link": INTENT_LINK[key]}
    item = next(i for i in load("assistant", "faq")["faq"] if i["id"] == key)
    return {"answer": s["answers"][key], "matched": key, "link": item["link"]}
