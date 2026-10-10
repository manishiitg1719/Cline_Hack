# FarmGuard — Handoff (read this first)

Project folder: `D:\Cline_Hackathon` · Git branch `main` · Remote `https://github.com/Greninja-07/Cline_Hackathon.git`
Owner: Archit. Machine: Windows, Python 3.14, Node 24.

Other docs: `README.md` (how to run, structure) · `PROGRESS.md` (full build log per phase, API list, remaining work)
· `docs/DEMO_SCRIPT.md` (demo walkthrough) · `docs/FarmGuard_Judges_Overview.pdf` (judges overview).

## 0. Latest session (10 Oct 2026) — read this first

**Where the project lives now:** `C:\Users\my060\Cline_Hackathon\Cline_Hackathon` (not `D:\` any more).
It only needs to run on Archit's laptop (no Android / phone build).

**Python on this laptop:** plain `python` opens an MSYS2 Python with no pip. Always use **`py`**
(Python 3.14). `start.bat` was changed to use `py`. Tests: `cd backend; py -m pytest -q`.

**Done this session (NOT committed yet — run `git status`):**
- New look like the AgriSmart reference: top nav bar + "More" menu (replaces the sidebar that could not scroll),
  cream / dark green / amber theme (`tailwind.config.js` colors `forest`, `cream`, `sage`, `accent`; `brand` remapped),
  new Home page (`pages/Dashboard.jsx`: hero, photo card, action hub, field summary with temp/rain/wind).
  Also changed: `components/Layout.jsx`, `index.css`, `LanguageSwitcher.jsx`, `FeatureGrid.jsx`, `NotificationBell.jsx`.
- Govt Schemes: every scheme now has about, benefits, who can / cannot apply, documents, steps, timing, helpline
  (EN + HI) in `shared/schemes/schemes.json`. Voice buttons ("Who can apply" / "Listen full scheme") in `pages/Schemes.jsx`.
- Voice helper `frontend/src/lib/speak.js` (browser speechSynthesis, splits long text). Hindi needs the Windows Hindi voice.
- Ask FarmGuard: mic button (browser SpeechRecognition, needs internet), answers read aloud (on/off switch), listen button per answer.
  File: `pages/Assistant.jsx`.
- My Farm map: satellite view by default (Esri tiles), Satellite/Map toggle, yellow circle around the farm.
  File: `components/LocationPicker.jsx`.
- New UI text added to both `en.json` and `hi.json` (key parity test passes). 84 backend + 18 frontend tests pass, build OK.
- `backend/.env` now exists (git-ignored): Cline AI key set (`LLM_BASE_URL=https://api.cline.bot/api/v1`,
  `LLM_MODEL=anthropic/claude-sonnet-4-6`) and `DATA_GOV_API_KEY` set. Never commit `.env`. Not yet checked
  that the Cline key works — open System Status and confirm the AI row says LIVE.
- Leftover temp file `frontend/dist/_preview.tgz` can be deleted (dist is git-ignored).
- A pitch deck was made separately (13 slides, Claude artifact "FarmGuard Pitch Deck").
- **Cline SDK agent (bonus points):** `agent/server.mjs` uses `@cline/agents` (Cline SDK) with `providerId: 'cline'` and the
  Cline key from `backend/.env`. One tool, `get_farm_info`. Backend `services/assistant.py` asks it first
  (`AGENT_URL`, default http://127.0.0.1:8010/ask); if it is down it uses the old LLM/FALLBACK path. `start.bat` installs and
  starts it, `stop.bat` stops port 8010. Tested end to end: answer source shows "Cline SDK agent · tools: get_farm_info".
- Model id fixed: `anthropic/claude-sonnet-4-6` does NOT exist on the Cline API -> now `LLM_MODEL=anthropic/claude-haiku-5.5`.

**Next task Archit wants: live Mandi Prices (about 45–60 min)**
- `providers/registry.py` already registers `MarketProvider("market", "Mandi prices", "data.gov.in AGMARKNET", ...)`
  but it only uses the static MSP table. Key is in `.env` as `DATA_GOV_API_KEY` (read via `config.data_gov_api_key`).
- Data: `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=KEY&format=json&limit=100`
  with `filters[state]=...`, `filters[district]=...`, `filters[commodity]=...`. Fields: state, district, market, commodity,
  variety, arrival_date, min_price, max_price, modal_price (Rs per quintal).
- Build: LIVE = today's prices for the farmer's crop in nearby mandis (farm state/district); FALLBACK = last saved
  prices (a cache table like `weather_cache`) or MSP from `shared/crops/crops.json`. Show `ModeBadge`.
  New endpoint (e.g. `GET /api/market/prices`), a "Mandi Prices" page or Home card, EN + HI text, compare with MSP.
  Optionally let Crop Advisor use the live price for profit. Add tests with a mocked API response.
- Do NOT ask the AI (Cline key) for prices — it would make numbers up. AI may only write a short tip on top of real data.
- Map our crop ids to AGMARKNET commodity names (e.g. rice -> "Paddy(Dhan)(Common)", wheat -> "Wheat", potato -> "Potato").
- Archit said NO to: fertilizer feature, longer WhatsApp messages, offline voice.
- Archit's rule: explain the plan first and wait for his "start" before changing code.

## 1. What FarmGuard is
Offline-capable farming web app (PWA) for Indian smallholders, English + Hindi. Every smart feature has a
**LIVE** mode (online service) and a **FALLBACK** mode (built-in data) and shows which one with a `ModeBadge`.
No paid API needed.

## 2. Status: all 9 build phases are DONE, plus a UI redesign
| Phase | Feature | Main files |
|---|---|---|
| 1 | Login/Register, farm profile + map, EN/HI, LIVE/FALLBACK layer, System Status | `routers/auth.py, farm.py, status.py` · `pages/FarmProfile.jsx, SystemStatus.jsx` |
| 2 | Quick messages (WhatsApp/SMS links), contacts, notification bell | `routers/messages.py` · `shared/messages/` · `pages/Messages.jsx` |
| 3 | Family Helper (6-digit link code, helper acts for farmer) | `routers/family.py` · `pages/Family.jsx` · `components/HelpMeButton.jsx` |
| 4 | Weather (Open-Meteo) + irrigation advice (FAO-56) | `providers/weather.py` · `services/irrigation.py` · `pages/Weather.jsx, Irrigation.jsx` |
| 5 | Offline disease scanner (ONNX in browser) + treatment guide | `public/models/disease/` · `lib/diseaseModel.js` · `shared/disease/` · `pages/Scan.jsx` |
| 6 | Village Disease Radar (DBSCAN clusters + weather risk, alerts) | `services/radar.py, disease_risk.py` · `pages/Radar.jsx` |
| 7 | Smart Crop Advisor (SoilGrids + climate, Top-3 crops, rotation) | `services/crop_advisor.py, crop_plan.py` · `shared/crops/crops.json` · `pages/CropAdvisor.jsx` |
| 8 | Satellite field health (Sentinel-2 via Planetary Computer) | `providers/sentinel.py` · `services/field_health.py` · `pages/FieldHealth.jsx` |
| 9 | Assistant, Govt schemes, Rent/Waste market, PWA install, docs | `services/assistant*.py` · `shared/assistant/, shared/schemes/` · `pages/Assistant.jsx, Schemes.jsx, Market.jsx` |
| UI | Sunny-field redesign of Login/Register + faint photo background in the app (commit `26e24b8`) | see section 4 |

(`routers/`, `services/`, `providers/` are under `backend/app/`; `pages/`, `components/`, `lib/` under `frontend/src/`.)

## 3. Folder map
```
D:\Cline_Hackathon
├─ start.bat / stop.bat     one-click start (backend :8000 + frontend :5173 + demo seed + opens browser) / stop all
├─ README.md, PROGRESS.md, HANDOFF.md, LICENSE (MIT)
├─ backend\                 FastAPI + SQLite
│   ├─ app\main.py          entry · config.py (.env settings) · models.py (tables) · security.py (JWT, bcrypt, helper rules)
│   ├─ app\providers\       LIVE/FALLBACK providers (weather, soil, climate, satellite, sentinel, llm) + registry.py
│   ├─ app\routers\         API endpoints
│   ├─ app\services\        business logic (irrigation, radar, disease_risk, crop_advisor, assistant, alerts, notify…)
│   ├─ scripts\             seed_demo.py (demo accounts), radar_demo.py, smoke_test.py, verify_disease_model.py
│   ├─ tests\               83 pytest tests
│   ├─ .env.example         all keys optional (copy to .env — .env does NOT exist yet)
│   └─ farmguard.db         local SQLite DB (git-ignored)
├─ frontend\                React 18 + Vite + Tailwind + Leaflet + react-i18next
│   ├─ src\pages\           one file per screen (15 pages)
│   ├─ src\components\      shared UI (Layout = sidebar/bottom nav, ModeBadge, LanguageSwitcher, maps, cards…)
│   ├─ src\locales\         en.json, hi.json (UI text; a test enforces identical keys)
│   ├─ src\lib\             disease model, message renderer, scan queue, weather helpers
│   ├─ src\context\AuthContext.jsx   user, token, actingFor (helper mode)
│   ├─ src\api.js           fetch wrapper (/api proxied to :8000), server-down handling
│   ├─ src\sw-template.js   service worker template (plugin in vite.config.js builds dist/sw.js)
│   ├─ src\index.css        global CSS incl. hero background + sun animations
│   ├─ public\img\          field-sun.webp / field-sun-sm.webp (hero photo) + CREDITS.md
│   ├─ public\models\disease\  model.onnx (24 MB), centroids, meta, LICENSE, example leaf photos
│   └─ scripts\             QA: page-tour, register-ui-test, offline-test, browser-selftest, farm-save-test, screenshot (.mjs)
├─ shared\                  JSON data used by backend AND frontend (messages, disease KB, crops, FAQ, schemes)
└─ docs\                    DEMO_SCRIPT.md, judges PDF + generator (make_judges_pdf.py)
```

## 4. Latest work: UI redesign (commit `26e24b8`)
- `frontend/src/pages/Login.jsx` exports `AuthShell` (also used by `Register.jsx`): full-screen sunny rice-field photo,
  glass top bar (logo, language switch, Login↔Register button), headline "Right crop. Right water. Healthy harvest.",
  badge, feature chips, `SpeaksTicker` (cycles Hindi/English phrases), white glass form card.
  `trackCls(lng)` = uppercase + letter-spacing for English only (spacing breaks Devanagari).
- `frontend/src/index.css`: `.hero-bg` (photo, Ken Burns zoom, brightness 1.18 / saturate 1.25), `.hero-sun` glow,
  mobile variant, `prefers-reduced-motion` fallback, `body::before` = faint washed-out photo behind the logged-in app.
- `en.json` / `hi.json`: new `landing.*` keys · `tailwind.config.js`: `serif` font · `index.html`: preloads hero image.
- `components/Layout.jsx`: sidebar + bottom nav semi-transparent with backdrop-blur.
- `vite.config.js` + `sw-template.js`: `/img/` cached so the photo works offline.
- Photo: Unsplash `ZtLRT4j_lOA` (Unsplash License), credited in `frontend/public/img/CREDITS.md`.
- Archit has NOT given feedback on the new look yet. Offered tweaks: brighter/midday, other headline, other photo,
  stronger in-app background.

## 5. How to run
- Easiest: double-click `D:\Cline_Hackathon\start.bat` → opens http://localhost:5173. Keep both server windows open.
  `stop.bat` stops everything. After UI changes, hard-refresh with Ctrl+F5.
- Demo logins: farmer `9999900001` / `demo1234` (Hindi) · helper `9999900002` / `demo1234` (English).
- Manual: `cd backend; python -m uvicorn app.main:app --port 8000` · `cd frontend; npm run dev` ·
  `cd backend; python scripts/seed_demo.py` (once, after the backend is up).

## 6. How to test (all passing at commit `26e24b8`)
```powershell
cd D:\Cline_Hackathon\backend;  python -m pytest -q            # 83 tests, ~35 s
cd D:\Cline_Hackathon\frontend; npx vitest run                # 18 tests
cmd /c "cd /d D:\Cline_Hackathon\frontend && npx vite build"  # use cmd: PowerShell treats the chunk-size warning as an error
node scripts/page-tour.mjs          # all 15 pages render (servers must be running)
node scripts/register-ui-test.mjs   # sign-up flow in a real browser
node scripts/screenshot.mjs <path> <out.jpg|png> [width] [height] [1 = log in as demo farmer]
```
QA scripts drive headless Microsoft Edge. `screenshot.mjs` uses debug port 9337, so run only one at a time.

## 7. Remaining work
**Needs Archit's decision**
1. Feedback on the new login/background look.
2. ~~How to run on a phone~~ — not needed (laptop only). Old options kept for reference:
   a) Same Wi-Fi demo: run Vite with `--host`, open `http://<PC-IP>:5173` on the phone, add that origin to `CORS_ORIGINS`.
   b) Online: frontend on Vercel + backend on Render (HTTPS; PostgreSQL or persistent disk for SQLite).
   c) Android APK with Capacitor: wraps the built frontend; the backend must still be reachable online.

**Manual before the demo**
3. Verify Kharif MSPs + sugarcane FRP in `shared/crops/crops.json` against the latest CACP/PIB notice
   (only Rabi 2026-27 MSPs were confirmed).
4. Done (Cline key in `.env`). Old note: copy `backend/.env.example` to `backend/.env`; set `LLM_ENABLED=true`, `LLM_BASE_URL`, `LLM_API_KEY`,
   `LLM_MODEL` (vision-capable for Soil Health Card reading). Without it, the assistant + card reading use FALLBACK.
5. `git push origin main`: the commits are local only, nothing has been pushed. This session's work is not committed yet either.

**Small cleanup**
- `.pip.log` was committed by mistake → `git rm --cached .pip.log` and add it to `.gitignore`.

**Not built (future ideas)**: listed at the bottom of `PROGRESS.md` (soil-photo model, rice/wheat/cotton diseases,
live mandi prices, Web Push, field boundary drawing, background sync, production hardening, more languages).

## 8. Conventions to keep
- Every new UI string goes in BOTH `en.json` and `hi.json` (a vitest test checks key parity).
- Every smart feature: LIVE + FALLBACK via `backend/app/providers/registry.py`, and show `ModeBadge` in the UI.
- Shared data lives in `shared/` as JSON and is read by both backend and frontend.
- No paid APIs required; all keys in `.env` are optional.
- Don't letter-space or uppercase Hindi text.

