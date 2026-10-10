"""Crop plan: Top-3 + not-recommended + 3-season rotation + fertilizer tips + confidence."""
from __future__ import annotations

from .crop_advisor import crop_db, rank

NEXT_SEASON = {"kharif": "rabi", "rabi": "zaid", "zaid": "kharif"}
TYPICAL_CLIMATE = {"kharif": (29.0, 800.0), "rabi": (18.0, 60.0), "zaid": (32.0, 80.0)}


def fertilizer_tips(soil: dict) -> list[dict]:
    """Soil-improvement tips. Thresholds = Soil Health Card 'low' ratings (ICAR):
    available N < 280 kg/ha, Olsen P < 10 kg/ha, K < 110 kg/ha, organic carbon < 0.5 %, pH < 6 / > 8.3."""
    tips = []
    checks = [("ph", lambda v: v < 6.0, "acidic"), ("ph", lambda v: v > 8.3, "alkaline"), ("n", lambda v: v < 280, "low_n"),
              ("p", lambda v: v < 10, "low_p"), ("k", lambda v: v < 110, "low_k"), ("oc", lambda v: v < 0.5, "low_oc")]
    for field, bad, code in checks:
        v = soil.get(field)
        if v is not None and bad(v):
            tips.append({"code": code, "value": v})
    return tips


def rotation_plan(first: str, season: str, ctx: dict) -> list[dict]:
    """Best crop for the next two seasons given the previous crop (typical seasonal climate)."""
    plan = [{"season": season, "crop": first}]
    last, s = first, season
    for _ in range(2):
        s = NEXT_SEASON[s]
        t, rain = TYPICAL_CLIMATE[s]
        best = next((r for r in rank({**ctx, "season": s, "temperature": t, "rainfall": rain, "last_crop": last}) if r["score"] > 0), None)
        plan.append({"season": s, "crop": best["crop"] if best else None})
        last = best["crop"] if best else ""
    return plan


def confidence(sources: dict) -> str:
    """high = lab values from Soil Health Card; medium = SoilGrids live; basic = typical/fallback values."""
    if sources.get("card"):
        return "high"
    if sources.get("soil_mode") == "live":
        return "medium"
    return "basic"


def build_plan(ctx: dict, soil_values: dict, sources: dict) -> dict:
    ranked = rank(ctx)
    top = [r for r in ranked if r["score"] > 0][:3]
    in_season = set(k for k, c in crop_db().items() if ctx["season"] in c["seasons"])
    not_rec = [{"crop": r["crop"], "blockers": r["blockers"]} for r in ranked if r["score"] == 0 and r["crop"] in in_season][:5]
    return {
        "season": ctx["season"], "top": top, "not_recommended": not_rec,
        "rotation_plan": rotation_plan(top[0]["crop"], ctx["season"], ctx) if top else [],
        "fertilizer_tips": fertilizer_tips(soil_values), "confidence": confidence(sources),
    }
