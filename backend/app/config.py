"""Central configuration loaded from environment variables / `.env`."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


class Settings:
    def __init__(self) -> None:
        self.app_name = "FarmGuard"
        self.version = "0.1.0"
        self.secret_key = os.getenv("SECRET_KEY", "dev-secret-change-me-please-use-a-long-random-value")
        self.token_expire_hours = int(os.getenv("TOKEN_EXPIRE_HOURS", "72"))
        self.database_url = os.getenv("DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'farmguard.db'}")
        self.cors_origins = [
            o.strip()
            for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
            if o.strip()
        ]
        self.force_fallback = _bool("FORCE_FALLBACK", False)
        # Village Disease Radar background analysis interval (0 = disabled; use the "Run now" button)
        self.radar_interval_minutes = int(os.getenv("RADAR_INTERVAL_MINUTES", "60"))

        # LLM
        self.llm_enabled = _bool("LLM_ENABLED", False)
        self.llm_base_url = os.getenv("LLM_BASE_URL", "").rstrip("/")
        self.llm_api_key = os.getenv("LLM_API_KEY", "")
        self.llm_model = os.getenv("LLM_MODEL", "")
        self.llm_daily_call_limit = int(os.getenv("LLM_DAILY_CALL_LIMIT", "200"))

        # Free services
        self.open_meteo_enabled = _bool("OPEN_METEO_ENABLED", True)
        self.soilgrids_enabled = _bool("SOILGRIDS_ENABLED", True)

        # Optional keyed services
        self.data_gov_api_key = os.getenv("DATA_GOV_API_KEY", "")
        self.openweather_api_key = os.getenv("OPENWEATHER_API_KEY", "")
        # Sentinel-2 via Microsoft Planetary Computer: free, no key → on by default
        self.satellite_enabled = _bool("SATELLITE_ENABLED", True)


@lru_cache
def get_settings() -> Settings:
    return Settings()
