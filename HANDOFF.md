# FarmGuard — Handoff (read this first)

Project folder: `D:\Cline_Hackathon` · Git branch `main` · Remote `https://github.com/Greninja-07/Cline_Hackathon.git`
Owner: Archit. Machine: Windows, Python 3.14, Node 24.

Other docs: `README.md` (how to run, structure) · `PROGRESS.md` (full build log per phase, API list, remaining work)
· `docs/DEMO_SCRIPT.md` (demo walkthrough) · `docs/FarmGuard_Judges_Overview.pdf` (judges overview).

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
2. How to run on a phone:
   a) Same Wi-Fi demo: run Vite with `--host`, open `http://<PC-IP>:5173` on the phone, add that origin to `CORS_ORIGINS`.
   b) Online: frontend on Vercel + backend on Render (HTTPS; PostgreSQL or persistent disk for SQLite).
   c) Android APK with Capacitor: wraps the built frontend; the backend must still be reachable online.

**Manual before the demo**
3. Verify Kharif MSPs + sugarcane FRP in `shared/crops/crops.json` against the latest CACP/PIB notice
   (only Rabi 2026-27 MSPs were confirmed).
4. Optional AI key: copy `backend/.env.example` to `backend/.env`; set `LLM_ENABLED=true`, `LLM_BASE_URL`, `LLM_API_KEY`,
   `LLM_MODEL` (vision-capable for Soil Health Card reading). Without it, the assistant + card reading use FALLBACK.
5. `git push origin main`: the commits are local only, nothing has been pushed.

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

