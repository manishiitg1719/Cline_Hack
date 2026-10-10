# 🌾 FarmGuard

**Smart when online, helpful when offline, always in the farmer's language.**

FarmGuard is a farming web app for small farmers in India. It works in **Hindi and English**, and most of it keeps
working even when the internet is gone. You can install it from the browser like a normal app.

We built it because farm apps usually fail in exactly the places farmers need them: the field has bad network,
the advice is in English, and a disease is only noticed after it has already spread to the next farm.

## What it can do

| | Feature | What it does |
|---|---|---|
| 🦠 | **Disease scan** | Take a photo of a leaf. An AI model running *on your device* names the disease (26 diseases, 14 crops) and shows how to treat it. Works offline. |
| 📡 | **Village Disease Radar** | When several farms nearby report the same disease, and the weather helps it spread, nearby farmers growing that crop get a warning. |
| 🌱 | **Crop Advisor** | Uses the soil map, last year's weather and your Soil Health Card to suggest the top 3 crops, expected profit and a rotation plan. |
| 💧 | **Irrigation & weather** | 7-day forecast and a simple answer: *Irrigate now*, *Delay* or *No need* (FAO-56 water balance). Weather alerts too. |
| 🛰️ | **Field health** | Free Sentinel-2 satellite images give a greenness score, trend and a warning for weak patches. |
| 💬 | **Ask FarmGuard** | Ask farming questions. It's an AI agent built with the **Cline SDK** that looks up your own farm data (crop, weather, watering advice, nearby disease alerts) before it answers. Tap 🎤 to speak, and answers are read out loud. |
| 🏛️ | **Govt schemes** | 8 big schemes (PM-KISAN, crop insurance, KCC…) explained properly: benefits, who can and can't apply, documents, steps, helpline. Tap 🔊 to hear it. |
| 👨‍👩‍👦 | **Family Helper** | A son or daughter links with a 6-digit code and can help run the farm from anywhere, with the farmer's permission. |
| 📨 | **Messages** | Pick a ready message, it gets written in the other person's language, and opens in WhatsApp or SMS. |
| 🚜 ♻️ | **Rent & waste** | Rent out or find farm machines nearby, and sell crop waste like straw and husk. |
| 🗺️ | **My Farm** | Mark your field on a satellite map, add land size, soil, water source and crops. |

### LIVE and FALLBACK

Every smart feature has two modes, and the app always shows which one you're getting:

- **LIVE** – fresh data from an online service (weather, satellite, soil map, AI answers).
- **FALLBACK** – saved or built-in data when you're offline or a service is down.

So nothing just breaks when the network drops, and the farmer knows how fresh the advice is.
The **System Status** page shows every service and its mode.

## How to run it (Windows)

You need **Python 3.11+** (we use 3.14) and **Node 18+**.

> On our laptop the `python` command opens a different Python (from MSYS2) with no pip, so we use **`py`** everywhere.
> If `python` works fine for you, you can use that instead.

**Easiest way:** double-click **`start.bat`** in the project folder.

It installs what's missing the first time, starts the backend, the frontend and the Cline SDK agent in small windows, loads demo data
and opens **http://localhost:5173**. Keep those two windows open while you use the app. **`stop.bat`** closes everything.

Demo logins:

| Who | Phone | Password | Language |
|---|---|---|---|
| Farmer | `9999900001` | `demo1234` | Hindi |
| Family helper | `9999900002` | `demo1234` | English |

After changing anything in the UI, press **Ctrl + F5** in the browser.

### Running it by hand (3 terminals)

```powershell
# 1) backend – leave it running
cd backend
py -m pip install -r requirements.txt
py -m uvicorn app.main:app --port 8000

# 2) frontend – leave it running
cd frontend
npm install
npm run dev

# 3) demo data – runs once and exits (start the backend first)
cd backend
py scripts/seed_demo.py
```

Optional 4th terminal for the AI agent: `cd agent`, `npm install`, `node server.mjs` (port 8010).

Open **http://localhost:5173**. Port 8000 is only the API (docs at http://127.0.0.1:8000/docs).

### Optional keys

Nothing needs a paid API. All keys are optional. Copy `backend/.env.example` to `backend/.env` and fill in what you have:

- `LLM_ENABLED`, `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL` – AI answers in Ask FarmGuard and Soil Health Card reading
  (any OpenAI-style API works, e.g. Cline or OpenRouter). Without it, the assistant uses its built-in answers.
- `DATA_GOV_API_KEY` – free key from data.gov.in, for mandi prices.
- `FORCE_FALLBACK=true` – switch everything to FALLBACK (handy for demos).

`.env` is in `.gitignore`. Don't commit your keys.

### Voice

Voice uses the browser's own speech, so it's free. Use **Chrome or Edge**.
- Reading out loud works offline. For Hindi, install the Hindi voice in Windows:
  *Settings → Time & language → Speech → Add voices → Hindi*.
- The 🎤 mic needs internet, and the browser will ask for mic permission once.

## Tests

```powershell
cd backend;  py -m pytest -q        # 84 tests
cd frontend; npx vitest run         # 18 tests
cmd /c "cd /d frontend && npx vite build"
```

Use `cmd` for the build, because PowerShell treats the chunk-size warning as an error.

## When something goes wrong

| You see | Why | Fix |
|---|---|---|
| "The FarmGuard server is not running" | Backend window closed or crashed | Run `stop.bat`, then `start.bat` |
| `No module named uvicorn` / `No module named pip` | Wrong Python is being used | Use `py` instead of `python` |
| `Port 5173 is already in use` | Old frontend still running | `stop.bat`, then start again |
| `seed_demo.py`: backend is not running | Seed ran before the backend | Start the backend first |
| Hindi voice sounds wrong | No Hindi voice on Windows | Add the Hindi voice (see Voice) |

## Tech used

- **Frontend:** React 18, Vite, Tailwind CSS, Leaflet maps, react-i18next, installable PWA
- **Backend:** FastAPI, SQLite, scikit-learn (DBSCAN for the radar)
- **Disease AI:** DINOv2-small model running in the browser with ONNX Runtime Web
- **AI agent:** `agent/server.mjs`, built with the **Cline SDK** (`@cline/agents`) and the Cline API. It has a `get_farm_info` tool and powers Ask FarmGuard. If it's not running, the app falls back to the normal answers
- **Free data:** Open-Meteo, ISRIC SoilGrids, Sentinel-2 via Microsoft Planetary Computer, OpenStreetMap, Esri imagery

## Project folders

```
backend/          FastAPI + SQLite
  app/providers/  LIVE / FALLBACK data sources (weather, soil, satellite, AI, market)
  app/routers/    API endpoints
  app/services/   the logic (irrigation, radar, crop advisor, assistant, alerts…)
  scripts/        demo data and test helpers
  tests/          pytest
agent/           Cline SDK agent for Ask FarmGuard (Node, port 8010)
frontend/         React app
  src/pages/      one file per screen
  src/components/ shared parts (top bar, maps, badges…)
  src/locales/    all UI text (en.json, hi.json)
  src/lib/        disease model, voice, messages, weather helpers
shared/           data used by both sides (schemes, crops, disease guide, FAQ, messages)
docs/             demo script and judges PDF
```

More detail: [`HANDOFF.md`](HANDOFF.md) (current status and next task) · [`PROGRESS.md`](PROGRESS.md) (full build log) ·
[`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) (demo steps).

## Credits

- Disease model: [plant-disease-dinov2-small](https://huggingface.co/rodynaemad/plant-disease-dinov2-small) by Rodayna Emad (CC BY-SA 4.0), trained on PlantVillage.
- Data: Open-Meteo, ISRIC SoilGrids, Copernicus Sentinel-2 (via Microsoft Planetary Computer), OpenStreetMap, Esri imagery.
- Login photo: Unsplash (see `frontend/public/img/CREDITS.md`).

## License

MIT, see [LICENSE](LICENSE).
