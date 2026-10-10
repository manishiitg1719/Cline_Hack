"""FarmGuard FastAPI application entry point.

Run (from the `backend` folder):  python -m uvicorn app.main:app --reload --port 8000
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import SessionLocal, init_db
from .routers import auth, crop, family, farm, messages, radar, radar_demo, scans, status, weather
from .services import radar as radar_service

settings = get_settings()
log = logging.getLogger("farmguard")


async def radar_loop() -> None:
    """Village Disease Radar: analyse synced scans every hour (first run 1 min after start)."""
    await asyncio.sleep(60)
    while True:
        try:
            await asyncio.to_thread(_run_radar)
        except Exception:  # never let the background job crash the app
            log.exception("radar analysis failed")
        await asyncio.sleep(settings.radar_interval_minutes * 60)


def _run_radar() -> None:
    with SessionLocal() as db:
        radar_service.analyze(db)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    task = asyncio.create_task(radar_loop()) if settings.radar_interval_minutes > 0 else None
    yield
    if task:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task


app = FastAPI(title=f"{settings.app_name} API", version=settings.version, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (status.router, auth.router, farm.router, messages.router, family.router, weather.router, scans.router,
          radar.router, radar_demo.router, crop.router):
    app.include_router(r)
