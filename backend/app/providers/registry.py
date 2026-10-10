"""All providers in one place + their configuration checks.

Phase 1 registers every provider so the System Status page is complete; the
actual live/fallback calls are implemented module by module in later phases.
"""
from __future__ import annotations

from ..config import get_settings
from .base import Provider


class LLMProvider(Provider):
    def configured(self):
        s = get_settings()
        if not s.llm_enabled:
            return False, "LLM_ENABLED is false"
        if not (s.llm_api_key and s.llm_base_url and s.llm_model):
            return False, "LLM_API_KEY / LLM_BASE_URL / LLM_MODEL not set"
        return True, ""


class OpenMeteoProvider(Provider):
    def configured(self):
        return (True, "") if get_settings().open_meteo_enabled else (False, "OPEN_METEO_ENABLED is false")


class SoilGridsProvider(Provider):
    def configured(self):
        return (True, "") if get_settings().soilgrids_enabled else (False, "SOILGRIDS_ENABLED is false")


class MarketProvider(Provider):
    def configured(self):
        return (True, "") if get_settings().data_gov_api_key else (False, "DATA_GOV_API_KEY not set")


class EarthEngineProvider(Provider):
    def configured(self):
        return (True, "") if get_settings().earth_engine_enabled else (False, "EARTH_ENGINE_ENABLED is false")


PROVIDERS: dict[str, Provider] = {
    p.name: p
    for p in (
        LLMProvider("llm", "AI assistant & vision", "LLM API", "Built-in knowledge & rules", needs_key=True),
        OpenMeteoProvider("weather", "Weather forecast", "Open-Meteo", "Last saved forecast"),
        SoilGridsProvider("soil", "Soil data by location", "ISRIC SoilGrids", "Regional soil averages"),
        MarketProvider("market", "Mandi prices", "data.gov.in AGMARKNET", "MSP table / last saved prices", needs_key=True),
        EarthEngineProvider("satellite", "Satellite field health", "Google Earth Engine", "Weather + soil estimate", needs_key=True),
    )
}


def get_provider(name: str) -> Provider:
    return PROVIDERS[name]


def all_status() -> list[dict]:
    return [p.status() for p in PROVIDERS.values()]
