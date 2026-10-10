# FarmGuard — Build Progress

Languages: **English + Hindi**. WhatsApp/SMS = tap-to-send links (no automatic sending).
Every feature must support **LIVE / FALLBACK** and show a `ModeBadge`.

## Phase checklist

| # | Phase | Status |
|---|---|---|
| 1 | Setup · Farmer/Helper login · Farm profile + map · EN/HI language system · LIVE/FALLBACK provider layer + System Status page | ✅ Done |
| 2 | 📨 Quick Message Center — template picker UI, WhatsApp/SMS/Copy/Share, contacts, in-app notification bell | ✅ Done |
| 3 | 👨‍👩‍👦 Family Helper — link by 6-digit code, helper's farmer list + "acting for", view/edit permission, "Help me" button | ✅ Done |
| 4 | 🌦️ Weather (Open-Meteo + cache fallback) + 💧 Irrigation decision, auto alert messages | ✅ Done |
| 5 | 🦠 Offline disease scanner (ONNX Runtime Web, DINOv2-small, 38 classes) + EN/HI treatment knowledge base + offline scan queue/sync | ✅ Done |
| 6 | 📡 Village Disease Radar — DBSCAN clusters over `scans`, weather risk (Hutton criteria etc.), alerts, Leaflet map, demo seed | ✅ Done |
| 7 | 🌱 Smart Crop Advisor — SoilGrids + seasonal climate, explainable scoring, Top-3, rotation, fertilizer tips, Soil Health Card (AI vision LIVE / manual FALLBACK) | ✅ Done (soil-PHOTO model skipped: no licensed open model found → picture-based soil picker + SoilGrids instead) |
| 8 | 🛰️ Satellite field health — Sentinel-2 via Microsoft Planetary Computer (free, no key) instead of Earth Engine; NDVI/NDMI, health score, trend, flags; weather-estimate FALLBACK | ✅ Done |
| 9 | Assistant chat, schemes/rental/waste pages, PWA offline, updated judges PDF, demo script | ⏳ Next |

## Phase 2 + 3 additions
- Backend: `GET /api/messages/templates`, `POST /api/messages/render`, `/api/contacts` CRUD, `GET /api/notifications`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`
- Backend: `GET /api/family`, `POST /api/family/link`, `PATCH /api/family/{link_id}` (farmer sets `can_edit`), `DELETE /api/family/{link_id}`, `POST /api/family/help`
- `services/notify.py` → `notify(db, user_id, kind, template_id, params, severity, include_helpers=True)` — **use this in Phase 4/6 for alerts** so helpers get them too. Text is rendered in each recipient's language when listed.
- Frontend: `pages/Messages.jsx` (template cards → dropdown blanks → auto-written preview → WhatsApp/SMS/Copy/Share; picks contact's language = language bridge), `components/Contacts.jsx`, `components/NotificationBell.jsx`, `components/ShareButtons.jsx` (**reuse on every result card**), `pages/Family.jsx`, `components/HelpMeButton.jsx`
- `backend/scripts/smoke_test.py` — end-to-end check against a running server

## Phase 4 additions
- `providers/weather.py` → `get_forecast(db, lat, lon)`: Open-Meteo LIVE (reuses a <30 min cached call), else last saved forecast from `weather_cache` table as FALLBACK with `stale_hours`. Normalised shape: `current`, `soil_moisture` (m³/m³), `rain_prob_24h`, `days[]` (`t_max,t_min,rain_mm,rain_prob,wind_max,et0,humid_hours,t_mean`). **`humid_hours`/`t_mean` are ready for Radar disease-risk rules (Phase 6).**
- `services/irrigation.py` → `decide()`: FAO-56 Kc × ET0, soil FC/WP by soil type, rain forecast → `irrigate|delay|monitor` + reason codes + litres for the farm area
- `services/alerts.py` → weather alert rules (heavy rain, heatwave ≥40 °C, wind ≥40 km/h) + `dispatch()` which de-duplicates via `alert_log` table and notifies farmer + helpers
- Endpoints: `GET /api/weather`, `GET /api/irrigation` (409 if farm location missing; helpers pass `farmer_id`)
- Frontend: `pages/Weather.jsx`, `pages/Irrigation.jsx`, `components/TodayCards.jsx` (dashboard), `hooks/useFarmData.js` + `components/FarmDataGate.jsx` (**reuse for every farm-scoped page**), `lib/weather.js`
- Test helpers: `backend/tests/weather_fixtures.py` (`make_raw`, `patch_weather`)

## Phase 5 additions
- **Model**: `frontend/public/models/disease/` — `model.onnx` (24 MB int8, CC BY-SA 4.0, see `LICENSE.md` there), `meta.json` (38 labels + OOD threshold 0.699), `centroids.f32`, 6 example photos.
  Chosen instead of TF.js because TensorFlow can't be installed on Python 3.14 here and ONNX needs no conversion.
- `frontend/src/lib/diseaseMath.js` (preprocess, softmax, centroid cosine OOD check, `interpret()` → `rejected|unsure|healthy|disease`; MIN_CONFIDENCE 0.5) — unit-tested.
- `frontend/src/lib/diseaseModel.js` — `onnxruntime-web/wasm`, all files (model + wasm runtime) fetched **cache-first** from Cache Storage `farmguard-model-v1` → **works offline after first load** (bump cache name when the model changes).
- `frontend/src/lib/scanQueue.js` — results saved on phone (localStorage), confident ones queued and synced via `POST /api/scans/sync` when online (`online` event + on page open).
- `shared/disease/kb_en.json`, `kb_hi.json` — symptoms/cause/treatment/prevention for all 26 diseases + crop names (EN/HI).
- Backend `routers/scans.py`: `POST /api/scans/sync` (batch, idempotent by `client_id`, drops confidence < 0.5, location rounded to 0.01° ≈ 1 km), `GET /api/scans`, `DELETE /api/scans/{id}`. **Radar reads `scans` where `shared=True`.**
- Pages: `pages/Scan.jsx` (lazy-loaded chunk), `components/DiseaseResult.jsx`, `components/ScanExtras.jsx`.
- QA: `frontend/selftest.html` + `node scripts/browser-selftest.mjs` (headless Edge; runs model online, then with model files BLOCKED → must pass from cache). Use with `npm run build && npx vite preview --port 4173` and `SELFTEST_URL=http://localhost:4173`. Backend twin: `python scripts/verify_disease_model.py` (needs `pip install onnxruntime`).

## Phase 6 additions
- `services/disease_risk.py` — per-disease weather rules for the next 3 days: late blight = **Hutton criteria** (t_min ≥ 10 °C and ≥ 6 h RH ≥ 90 %; 2 consecutive days = high); fungal_wet / scab / rust / mildew / bacterial / mites / whitefly rules; viruses/esca/HLB = not weather-driven.
- `services/radar.py` — `analyze(db)`: shared disease scans of last 7 days → **one point per farm** per disease → DBSCAN (haversine, eps 5 km, min 2 farms) → level `watch|warning|outbreak` via `level_for(farms, risk)` → alerts (template `radar_outbreak`) to farmers whose **current_crop** matches within radius + 5 km, plus their helpers; de-duplicated per outbreak level per ISO week via `alert_log`. Previous outbreaks are deactivated each run.
- Background job in `main.py` (`RADAR_INTERVAL_MINUTES`, default 60; 0 = off; first run 60 s after start).
- Endpoints: `GET /api/radar/map` (anonymous points + outbreaks within radius), `GET /api/radar/near-me`, `GET /api/radar/weather-risk` (weather-only risk for the farmer's crop — works with zero reports), `POST /api/radar/analyze`, demo: `POST /api/radar/demo/seed`, `DELETE /api/radar/demo` (demo farmers use phone `+00demo…`, scans/outbreaks `is_demo=True`).
- Message renderer: new param type `disease` (model label → readable EN/HI name from `shared/disease/kb_*.json`); crop names fall back to the disease KB (e.g. `pepper`).
- Frontend: `pages/Radar.jsx` (lazy), `components/RadarMap.jsx`, `OutbreakCard.jsx`, `RadarDemoPanel.jsx`, `RadarBanner.jsx` (dashboard), "shared with village" note in `DiseaseResult.jsx`.
- Demo script: `python scripts/radar_demo.py` (running server, real weather) — prints the alerts each person receives.

## Phase 7 additions
- `providers/soil.py` — ISRIC SoilGrids v2 (pH, clay, sand, SOC, N, CEC; 0–30 cm mean ÷ d_factor) LIVE; FALLBACK = typical values per Indian soil group. Some spots return nulls (→ fallback with note).
- `providers/climate.py` — last complete same-season averages (temp, rain, humidity) from Open-Meteo **archive** API; FALLBACK = typical plains values. `current_season()` (Kharif Jun–Oct, Rabi Nov–Feb, Zaid Mar–May).
- `providers/llm.py` — OpenAI-compatible `chat()` with **daily call cap** (`provider_usage` table) + `extract_json()`. Used by `/api/crop/read-card`; reusable for the Phase 9 assistant.
- `shared/crops/crops.json` — 15 crops: seasons, ECOCROP-style temp/pH/rain ranges, water need, soils, family, yield, price (MSP), cost, duration, sowing windows. **Kharif MSPs/FRP marked “verify”** (only Rabi 2026-27 MSPs were confirmed online).
- `services/crop_advisor.py` (trapezoid fits → score + reason codes, blockers: wrong season, needs irrigation, over budget, unsuitable pH/temp; goal weighting) and `services/crop_plan.py` (Top-3, not-recommended, 3-season rotation, Soil Health Card tips with ICAR “low” thresholds, confidence high/medium/basic).
- Endpoints: `POST /api/crop/advice` (season, soil_type, last_crop, water_source, budget, goal, card{ph,n,p,k,oc,ec}), `POST /api/crop/read-card` (multipart image; LIVE AI vision or FALLBACK → manual form).
- Frontend: `pages/CropAdvisor.jsx` (4-step wizard, lazy), `components/SeasonSoilStep.jsx`, `SoilCardStep.jsx`, `CropResults.jsx`; `apiUpload()` in `api.js`.
- Live check (Ludhiana, canal, after rice): Rabi → chickpea / mustard / wheat; Kharif → cotton / pigeon pea / groundnut (SoilGrids pH 8.0, archive 15.2 °C / 122 mm Rabi).

## Phase 8 additions
- **Data source changed**: Google Earth Engine needs an account → used **Microsoft Planetary Computer** (Sentinel-2 L2A, free, no key, plain HTTP). `SATELLITE_ENABLED=true` by default (`EARTH_ENGINE_ENABLED` removed).
- `providers/sentinel.py` — STAC search (cloud < 40 %) + server-side zonal statistics (TiTiler `item/statistics`) inside a ≈330 m box around the farm point: SCL (skip scenes where the **field** is < 80 % clear), NDVI `(B08-B04)/(B08+B04)`, NDMI `(B8A-B11)/(B8A+B11)`, low-NDVI patch %. One NDVI point per month (≤ 7) for the trend.
- `providers/satellite.py` — LIVE with 12 h in-memory cache per field; FALLBACK = weather-based water-condition estimate (soil moisture + 7-day rain vs ET0), clearly labelled.
- `services/field_health.py` — score 0–100 from NDVI; status healthy/moderate/stressed/bare; flags water_stress/water_ok/dropping/growing/patchy/bare_or_harvested.
- Endpoint `GET /api/satellite`. Frontend `pages/FieldHealth.jsx` (lazy; score ring, flags, SVG `NdviChart.jsx`, Esri satellite basemap with analysed area). Attribution shown (Copernicus Sentinel, Planetary Computer, Esri).
- Live check (Ludhiana rice field): 7 clear monthly images Apr→Oct, NDVI 0.12 → 0.45 (Sep) → 0.27 (8 Oct, "dropping" ≈ harvest time); first call ~13 s, cached ~0.01 s.

## What exists after Phase 1

**Backend (`backend/app`)**
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/me/language`, `POST /api/auth/me/link-code`
- `GET /api/farm`, `PUT /api/farm` (helpers pass `?farmer_id=`; edit needs `can_edit`) — rule lives in `security.resolve_farmer`
- `GET /api/health`, `GET /api/status` (all providers with mode/source/reason)
- Tables: users, farms, helper_links, contacts, notifications, activities, scans, outbreaks, provider_usage
- Providers registered: llm, weather, soil, market, satellite (`providers/registry.py`). Use `provider.live(data)` / `provider.fallback(data)` → `.envelope()` returns `{mode, source, note, data}`.

**Frontend (`frontend/src`)**
- Pages: Login, Register (role cards), Dashboard (link code, feature grid), FarmProfile (Leaflet map, GPS, soil, water, crops), SystemStatus
- `Layout.jsx` `NAV` array: set `ready: true` on an item when its page is built and add the route in `App.jsx`
- `AuthContext`: `user`, `actingFor` (helper's selected farmer `{user_id, name, can_edit}`), `farmerParam` for API calls

## How to continue (for the next session)
1. Read this file and `README.md`.
2. Start the next ⏳ phase. Keep tests passing: `backend> python -m pytest -q`, `frontend> npm test`, `npm run build`.
3. Update this checklist at the end of each phase.

## Verified at this checkpoint
- Backend: **76 pytest tests pass** (`python -m pytest -q`; takes ~30 s — run in background if your shell has a 30 s limit)
- Frontend: **18 vitest tests pass** (incl. EN/HI key parity, KB covers all 38 model classes, every crop reason / satellite flag translated), `npm run build` succeeds
- Radar live demo (real Open-Meteo weather, Ludhiana): 7 demo farms → OUTBREAK, alerts to farmer (Hindi), neighbour (English) and helper (English); hourly job ran without errors
- Offline model in real browser (headless Edge, production build): **7/7 online and 7/7 with model files blocked** (served from device cache); ~0.2–0.7 s per scan
- Live smoke test passed (register → farm → link helper → Hindi message → Help me → notification)
- Live Open-Meteo check passed (Nashik, black soil, potato → "Irrigate now", 7 % usable water, 0 mm rain forecast)

## Known notes
- Python packages install slowly on this machine; run pip in the background if it times out.
- `npm audit` reports dev-dependency advisories (vite/vitest dev server only) — not shipped to production.
