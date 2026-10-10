"""LLM provider (any OpenAI-compatible endpoint: OpenRouter, OpenAI, Groq, Together…).

LIVE only when LLM_ENABLED + key + base URL + model are set. A daily call cap (LLM_DAILY_CALL_LIMIT,
stored in provider_usage) protects credits. Callers must always have a FALLBACK path.
"""
from __future__ import annotations

import json
import re
from datetime import date

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import ProviderUsage
from .registry import get_provider


class LLMUnavailable(Exception):
    pass


def _use_quota(db: Session) -> None:
    s = get_settings()
    today = date.today().isoformat()
    row = db.scalar(select(ProviderUsage).where(ProviderUsage.provider == "llm", ProviderUsage.day == today))
    if row is None:
        row = ProviderUsage(provider="llm", day=today, calls=0)
        db.add(row)
    if row.calls >= s.llm_daily_call_limit:
        raise LLMUnavailable("Daily AI call limit reached")
    row.calls += 1
    db.commit()


def chat(db: Session, messages: list[dict], max_tokens: int = 600, temperature: float = 0.2) -> str:
    provider = get_provider("llm")
    ok, reason = provider.is_live()
    if not ok:
        raise LLMUnavailable(reason)
    _use_quota(db)
    s = get_settings()
    try:
        r = httpx.post(
            f"{s.llm_base_url}/chat/completions",
            headers={"Authorization": f"Bearer {s.llm_api_key}"},
            json={"model": s.llm_model, "messages": messages, "max_tokens": max_tokens, "temperature": temperature},
            timeout=45,
        )
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
        provider.mark_ok()
        return text
    except Exception as exc:
        provider.mark_error(f"{type(exc).__name__}: {exc}")
        raise LLMUnavailable(f"AI request failed: {type(exc).__name__}") from exc


def extract_json(text: str) -> dict:
    """Pull the first JSON object out of a model reply (handles ```json fences)."""
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise ValueError("no JSON in reply")
    return json.loads(m.group(0))
