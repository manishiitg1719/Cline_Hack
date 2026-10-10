"""Test setup: isolated temporary SQLite DB for every test session."""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

import pytest

_tmp = tempfile.mkdtemp(prefix="farmguard_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmp) / 'test.db'}"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-for-hs256"
os.environ["LLM_ENABLED"] = "false"
os.environ["FORCE_FALLBACK"] = "false"
os.environ["RADAR_INTERVAL_MINUTES"] = "0"  # no background job in tests
os.environ["AGENT_URL"] = "http://127.0.0.1:9/ask"  # never reach a real Cline SDK agent in tests

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def client():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


def register(client, phone="9876543210", role="farmer", name="Ramesh", language="hi"):
    r = client.post(
        "/api/auth/register",
        json={"name": name, "phone": phone, "password": "secret123", "role": role, "language": language},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    return body["user"], {"Authorization": f"Bearer {body['token']}"}
