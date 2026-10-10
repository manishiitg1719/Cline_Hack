# 🌾 FarmGuard

**Smart when online, helpful when offline, always in the farmer's language.**

FarmGuard is a farming web app (PWA) for Indian farmers: crop advice from a soil photo, offline leaf-disease
detection, a **Village Disease Radar** that warns neighbours before an outbreak spreads, irrigation advice,
satellite field health, and one-tap pre-written messages sent over WhatsApp/SMS — in **English and Hindi**.
A **Family Helper** mode lets a relative use the app on the farmer's behalf.

Every smart feature runs in **LIVE** mode (online API) or **FALLBACK** mode (built-in data) and always shows which.

> 📋 Build status and what's left: see [`PROGRESS.md`](PROGRESS.md).

## Project structure

```
backend/            FastAPI + SQLite
  app/
    main.py         app entry point
    config.py       settings from .env
    models.py       database tables
    security.py     password hashing, JWT, farmer/helper access rules
    providers/      LIVE / FALLBACK provider layer (+ registry)
    routers/        API endpoints (auth, farm, status, …)
    services/       messages (template renderer), …
  tests/            pytest
frontend/           React 18 + Vite + TailwindCSS + Leaflet + react-i18next
  src/pages/        screens
  src/components/   shared UI (Layout, ModeBadge, LocationPicker, …)
  src/locales/      UI text (en.json, hi.json)
  src/lib/          message renderer, options
shared/messages/    pre-written message templates used by BOTH backend and frontend
```

## Run locally (Windows)

**Backend** (Python 3.11+):
```powershell
cd D:\Cline_Hackathon\backend
python -m pip install -r requirements.txt
copy .env.example .env        # optional: every key is optional
python -m uvicorn app.main:app --reload --port 8000
```
API docs: http://127.0.0.1:8000/docs

**Frontend** (Node 18+):
```powershell
cd D:\Cline_Hackathon\frontend
npm install
npm run dev
```
Open http://localhost:5173 (the `/api` calls are proxied to the backend).

## Tests
```powershell
cd D:\Cline_Hackathon\backend;  python -m pytest -q
cd D:\Cline_Hackathon\frontend; npm test
```

## LIVE / FALLBACK
Configure services in `backend/.env` (see `.env.example`). Missing keys → that feature runs in FALLBACK.
`FORCE_FALLBACK=true` switches everything to fallback (demo / save credits).
The **System Status** page in the app shows each service's mode and the reason.

## License
MIT — see [LICENSE](LICENSE).