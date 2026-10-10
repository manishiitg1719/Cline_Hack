"""Farming assistant: LIVE = AI grounded in the farmer's own data; FALLBACK = built-in answers.

If no AI key is set, the daily cap is reached or the AI call fails, the FALLBACK answer is returned
and the reason is reported (mode/source/note) so the UI shows the right badge.
"""
from __future__ import annotations

import json

from sqlalchemy.orm import Session

from ..models import User
from ..providers import llm
from .assistant_fallback import fallback_answer, farm_context, strings

SYSTEM = (
    "You are FarmGuard, a farming assistant for Indian smallholder farmers. Answer in {lang_name}, in simple words, "
    "max 120 words. Use ONLY the farm data and reference notes given plus well-established agronomy; if unsure, "
    "say so and suggest the local KVK / Krishi officer. Never invent prices, doses or scheme amounts. "
    "For pesticides always say 'as per label'."
)


def intro(lang: str) -> dict:
    s = strings(lang)
    return {"greeting": s["greeting"], "suggestions": s["suggestions"]}


def answer(db: Session, farmer: User, text: str, lang: str, history: list[dict] | None = None) -> dict:
    ctx = farm_context(db, farmer)
    fb = fallback_answer(text, ctx, lang)
    farm_json = json.dumps({k: v for k, v in ctx.items() if k != "has_location"}, ensure_ascii=False)[:3000]
    messages = [
        {"role": "system", "content": SYSTEM.format(lang_name="Hindi" if lang == "hi" else "English")},
        {"role": "system", "content": "Farm data (JSON): " + farm_json},
    ]
    if fb["matched"]:
        messages.append({"role": "system", "content": "Reference note: " + fb["answer"]})
    for h in (history or [])[-6:]:
        if h.get("role") in ("user", "assistant") and isinstance(h.get("content"), str):
            messages.append({"role": h["role"], "content": h["content"][:500]})
    messages.append({"role": "user", "content": text})
    try:
        reply = llm.chat(db, messages, max_tokens=350, temperature=0.3)
        return {"mode": "live", "source": "AI + your farm data", "answer": reply.strip(), "link": fb["link"], "note": ""}
    except llm.LLMUnavailable as exc:
        return {"mode": "fallback", "source": "Built-in knowledge + your farm data", "answer": fb["answer"],
                "link": fb["link"], "note": str(exc)}
