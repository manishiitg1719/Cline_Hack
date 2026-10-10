"""Smart Crop Advisor — explainable crop suitability scoring.

score = 100 × temperature fit × pH fit × water fit × soil fit × rotation factor, then goal weighting.
Fit functions are trapezoids over FAO-ECOCROP style ranges (1.0 inside the optimum, falling to 0 at the
absolute limits). Every factor becomes a reason code, so the farmer sees WHY a crop is suggested.
Crop data: shared/crops/crops.json (edit there to update prices / ranges).
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

CROPS_FILE = Path(__file__).resolve().parents[3] / "shared" / "crops" / "crops.json"
IRRIGATED = {"canal", "borewell", "drip"}
WATER_RANK = {"low": 0, "medium": 1, "high": 2}
BUDGET_MAX_COST = {"low": 15000, "medium": 35000, "high": 10**9}  # ₹ per acre
CEREALS = {"cereal", "grass"}


@lru_cache
def crop_db() -> dict:
    return json.loads(CROPS_FILE.read_text(encoding="utf-8"))["crops"]


def trapezoid(v: float | None, lo: float, opt_lo: float, opt_hi: float, hi: float) -> float:
    if v is None:
        return 1.0
    if v <= lo or v >= hi:
        return 0.0
    if v < opt_lo:
        return (v - lo) / (opt_lo - lo)
    if v > opt_hi:
        return (hi - v) / (hi - opt_hi)
    return 1.0


def water_fit(c: dict, rain: float, water_source: str) -> tuple[float, str]:
    if water_source in IRRIGATED:
        if c["water"] == "high" and water_source == "drip":
            return 0.8, "water_drip_high"
        return 1.0, "water_irrigated"
    rmin, ropt = c["rain"]
    if rain >= ropt:
        return 1.0, "rain_good"
    if rain <= rmin * 0.5:
        return 0.0, "rain_too_low"
    if rain < rmin:
        return 0.35, "rain_low"
    return 0.6 + 0.4 * (rain - rmin) / (ropt - rmin), "rain_ok"


def rotation(key: str, last_crop: str) -> tuple[float, str | None]:
    db = crop_db()
    if not last_crop or last_crop not in db:
        return 1.0, None
    c, last = db[key], db[last_crop]
    if last_crop == key:
        return 0.7, "same_crop"
    if last["family"] in CEREALS and c["family"] == "legume":
        return 1.15, "legume_after_cereal"
    if last["family"] == c["family"] and c["family"] != "legume":
        return 0.85, "same_family"
    return 1.0, None


def _sort(fit: float, good: str, marginal: str, bad: str, reasons: list, warnings: list, blockers: list) -> None:
    (reasons if fit >= 0.9 else warnings if fit > 0 else blockers).append(good if fit >= 0.9 else marginal if fit > 0 else bad)


def evaluate(key: str, ctx: dict) -> dict:
    """Score one crop. ctx: season, temperature, rainfall, ph, soil_type, water_source, last_crop, budget, goal, area."""
    c = crop_db()[key]
    reasons, warnings, blockers = [], [], []
    if ctx["season"] not in c["seasons"]:
        blockers.append("wrong_season")

    ft = trapezoid(ctx["temperature"], *c["t"])
    _sort(ft, "temp_good", "temp_marginal", "temp_bad", reasons, warnings, blockers)
    fph = trapezoid(ctx.get("ph"), *c["ph"])
    if ctx.get("ph") is not None:
        _sort(fph, "ph_good", "ph_marginal", "ph_bad", reasons, warnings, blockers)

    fw, wcode = water_fit(c, ctx["rainfall"], ctx.get("water_source", ""))
    (reasons if fw >= 0.8 else warnings if fw > 0 else blockers).append(wcode)
    if c["water"] == "high" and ctx.get("water_source") not in IRRIGATED and fw < 1:
        blockers.append("needs_irrigation")

    soil = ctx.get("soil_type") or ""
    fs = 1.0 if (not soil or soil in c["soils"]) else 0.75
    if soil:
        (reasons if soil in c["soils"] else warnings).append("soil_good" if soil in c["soils"] else "soil_ok")

    fr, rcode = rotation(key, ctx.get("last_crop", ""))
    if rcode:
        (reasons if rcode == "legume_after_cereal" else warnings).append(rcode)
    if c["cost"] > BUDGET_MAX_COST.get(ctx.get("budget", "high"), 10**9):
        blockers.append("over_budget")

    worst = min(ft, fph, fw)
    yield_q = c["yield"] * (0.6 + 0.4 * worst)  # poorer fit → lower expected yield
    profit = yield_q * c["price"] - c["cost"]
    score = 100 * ft * fph * fw * fs * fr
    goal = ctx.get("goal", "profit")
    if goal == "low_water":
        score *= (1.15, 1.0, 0.75)[WATER_RANK[c["water"]]]
    elif goal == "improve_soil" and c["family"] == "legume":
        score *= 1.2
    elif goal == "low_risk":
        score *= 0.85 + 0.15 * worst
    elif goal == "profit":
        score *= 0.85 + 0.3 * max(0.0, min(profit / 60000, 1.0))
    if blockers:
        score = 0.0

    area = ctx.get("area") or 1.0
    return {
        "crop": key, "score": round(min(score, 100)), "reasons": reasons, "warnings": warnings, "blockers": blockers,
        "expected_yield_q_per_acre": round(yield_q, 1), "yield_range": [round(yield_q * 0.85, 1), round(yield_q * 1.1, 1)],
        "price_per_q": c["price"], "price_basis": c["price_basis"], "cost_per_acre": c["cost"],
        "income_per_acre": round(yield_q * c["price"]), "profit_per_acre": round(profit), "profit_total": round(profit * area),
        "water_need": c["water"], "duration_days": c["days"], "sowing_window": c["sow"].get(ctx["season"]),
        "fit": {"temperature": round(ft, 2), "ph": round(fph, 2), "water": round(fw, 2), "soil": fs, "rotation": fr},
    }


def rank(ctx: dict) -> list[dict]:
    return sorted((evaluate(k, ctx) for k in crop_db()), key=lambda r: (-r["score"], -r["profit_per_acre"]))
