"""Phase 7: crop scoring, rotation, fertilizer tips, soil/climate providers (no HTTP)."""
from datetime import date

import pytest

from app.providers import climate, soil
from app.providers.registry import get_provider
from app.services.crop_advisor import crop_db, evaluate, rank, trapezoid
from app.services.crop_plan import confidence, fertilizer_tips, rotation_plan

RABI = {"season": "rabi", "temperature": 17.0, "rainfall": 60.0, "ph": 7.2, "soil_type": "loamy",
        "water_source": "borewell", "last_crop": "", "budget": "high", "goal": "profit", "area": 2}


@pytest.fixture(autouse=True)
def _reset():
    for n in ("soil", "weather"):
        p = get_provider(n)
        p.state.last_ok = p.state.last_checked = None
        p.state.last_error = ""
    climate._cache.clear()


def down(*_):
    raise ConnectionError("offline")


def test_crop_db_valid():
    for k, c in crop_db().items():
        assert c["t"] == sorted(c["t"]) and c["ph"] == sorted(c["ph"]), k
        for s in c["seasons"]:
            assert s in c["sow"], f"{k} missing sowing window for {s}"


def test_trapezoid():
    assert trapezoid(15, 8, 13, 22, 28) == 1.0
    assert trapezoid(10.5, 8, 13, 22, 28) == 0.5
    assert trapezoid(30, 8, 13, 22, 28) == 0.0
    assert trapezoid(None, 0, 1, 2, 3) == 1.0


def test_rabi_irrigated_loam_prefers_rabi_crops():
    top = [r["crop"] for r in rank(RABI) if r["score"] > 0]
    assert top[0] in {"wheat", "potato", "mustard", "chickpea", "onion"}
    assert "rice" not in top and "cotton" not in top


def test_blockers():
    r = evaluate("rice", {**RABI, "season": "kharif", "temperature": 29, "rainfall": 400, "water_source": "rain"})
    assert r["score"] == 0 and "needs_irrigation" in r["blockers"]
    assert "wrong_season" in evaluate("cotton", RABI)["blockers"]
    assert "over_budget" in evaluate("potato", {**RABI, "budget": "low"})["blockers"]


def test_rotation_rules():
    assert "legume_after_cereal" in evaluate("chickpea", {**RABI, "last_crop": "wheat"})["reasons"]
    same = evaluate("wheat", {**RABI, "last_crop": "wheat"})
    assert "same_crop" in same["warnings"] and same["score"] < evaluate("wheat", RABI)["score"]


def test_income_math():
    r = evaluate("wheat", RABI)
    assert r["income_per_acre"] == round(r["expected_yield_q_per_acre"] * 2585)
    assert abs(r["profit_total"] - (r["income_per_acre"] - 17000) * 2) <= 2


def test_rotation_plan_three_seasons():
    plan = rotation_plan("wheat", "rabi", RABI)
    assert [p["season"] for p in plan] == ["rabi", "zaid", "kharif"]
    assert plan[1]["crop"] != "wheat"


def test_fertilizer_tips_and_confidence():
    codes = {t["code"] for t in fertilizer_tips({"ph": 5.4, "n": 200, "p": 25, "k": 90, "oc": 0.3})}
    assert codes == {"acidic", "low_n", "low_k", "low_oc"}
    assert confidence({"card": True}) == "high"
    assert confidence({"soil_mode": "live"}) == "medium"
    assert confidence({"soil_mode": "fallback"}) == "basic"


def test_soil_provider_live_nodata_and_down():
    live = soil.get_soil(30.9, 75.7, fetcher=lambda la, lo: {"ph": 8.0, "clay": 25, "sand": 41, "soc": 10.0, "nitrogen": 0.8, "cec": 19})
    assert live.mode == "live" and live.data["texture_class"] == "loamy"
    nodata = soil.get_soil(20.0, 73.8, "black", fetcher=lambda la, lo: None)
    assert nodata.mode == "fallback" and nodata.data["ph"] == 8.0 and "no data" in nodata.note
    assert soil.get_soil(1, 1, fetcher=down).data["texture_class"] == "alluvial"


def test_texture_classes():
    assert soil.classify_texture(5, 85) == "sandy"
    assert soil.classify_texture(45, 15) == "clay"
    assert soil.classify_texture(20, 40) == "loamy"


def test_season_and_climate_provider():
    assert climate.current_season(date(2026, 7, 1)) == "kharif"
    assert climate.current_season(date(2026, 12, 1)) == "rabi"
    assert climate.current_season(date(2026, 4, 1)) == "zaid"
    start, end = climate._window("rabi", date(2026, 10, 10))
    assert start == date(2025, 11, 1) and end == date(2026, 3, 28)
    r = climate.get_season_climate(1, 1, "rabi", fetcher=lambda *a: {"temperature": 16, "rainfall": 40, "humidity": 60, "period": "x"})
    assert r.mode == "live"
    assert climate.get_season_climate(2, 2, "kharif", fetcher=down).data["rainfall"] == 800.0
