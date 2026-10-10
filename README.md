# 🌾 FarmGuard

**Smart when online, helpful when offline, always in the farmer's language.**

FarmGuard is an installable, offline-capable farming web app (PWA) for Indian smallholders, in **English and Hindi**:

| | Feature |
|---|---|
| 🦠 | **Offline disease scan** — AI runs on the phone (26 diseases, 14 crops), treatment guide |
| 📡 | **Village Disease Radar** — scans from many farms + weather spread risk → early warnings to nearby farmers growing that crop |
| 🌱 | **Smart Crop Advisor** — soil map + last year's weather + Soil Health Card → Top-3 crops, profit, rotation plan |
| 💧 | **Irrigation & weather** — Irrigate now / Delay / No need (FAO-56), 7-day forecast, alerts |
| 🛰️ | **Satellite field health** — Sentinel-2 greenness score, trend, weak-patch warning |
| 💬 | **Farming assistant** — answers from your own farm data + built-in FAQ (AI when a key is set) |
| 📨 👨‍👩‍👦 | **Quick messages & Family Helper** — tap → message written in the right language → WhatsApp/SMS; relatives can help |
| 🏛️ 🚜 ♻️ | Govt schemes, equipment rental, crop-waste exchange |

Every smart feature runs in **LIVE** mode (online service) or **FALLBACK** mode (built-in / saved data) and always shows which.
No paid API is required.

> 📋 Build log & remaining work: [`PROGRESS.md`](PROGRESS.md) · 🎤 Demo: [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) · 📄 Judges PDF: [`docs/FarmGuard_Judges_Overview.pdf`](docs/FarmGuard_Judges_Overview.pdf)

## ▶️ How to run (easiest)
**Double-click `start.bat`** in `D:\Cline_Hackathon`. It opens **two server windows** (Backend + Frontend), loads demo
data and opens http://localhost:5173. **Keep both windows open** while using the app. `stop.bat` stops everything.

Demo logins: farmer `9999900001` / `demo1234` (Hindi) · helper `9999900002` / `demo1234` (English).

### Manual way — needs THREE separate terminals (the servers keep running)
```powershell
# Terminal 1 — backend (leave it running)
cd D:\Cline_Hackathon\backend
python -m uvicorn app.main:app --port 8000

# Terminal 2 — frontend (leave it running)
cd D:\Cline_Hackathon\frontend
npm run dev

# Terminal 3 — demo data (one time; runs and exits)
cd D:\Cline_Hackathon\backend
python scripts/seed_demo.py
```
Open **http://localhost:5173** (the app). Port 8000 is only the API.

### Troubleshooting
| You see | Cause | Fix |
|---|---|---|
| "Cannot reach the FarmGuard server" in the app | Backend window closed / not started | Start Terminal 1 (or `start.bat`) |
| `Port 5173 is already in use` | An old frontend is still running | Run `stop.bat`, then start again |
| `seed_demo.py`: "backend is not running" | Seed run before the backend | Start the backend first, then re-run |
| `http://127.0.0.1:8000` shows "API is running" | That's the backend, not the app | Open http://localhost:5173 |

## Credits
Disease model: [plant-disease-dinov2-small](https://huggingface.co/rodynaemad/plant-disease-dinov2-small) by Rodayna Emad (CC BY-SA 4.0), PlantVillage data.
Data: Open-Meteo, ISRIC SoilGrids, Copernicus Sentinel-2 via Microsoft Planetary Computer, OpenStreetMap, Esri imagery.

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