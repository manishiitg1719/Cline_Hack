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
| 5 | 🦠 Offline disease scanner (TF.js MobileNetV2) + EN/HI treatment knowledge base | ⏳ Next |
| 6 | 📡 Village Disease Radar — scan sync, DBSCAN clusters, weather risk, alerts, Leaflet heatmap, demo seed | ⬜ Todo (DB tables `scans`, `outbreaks` already exist) |
| 7 | 🌱 Smart Crop Advisor — soil photo, Soil Health Card OCR, Top-3 crops, rotation plan | ⬜ Todo |
| 8 | 🛰️ Satellite field health (Earth Engine / estimate fallback) | ⬜ Todo |
| 9 | Assistant chat, schemes/rental/waste pages, PWA offline, updated judges PDF, demo script | ⬜ Todo |

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
- Backend: **36 pytest tests pass** (`python -m pytest -q`)
- Frontend: **5 vitest tests pass** (incl. EN/HI key parity), `npm run build` succeeds
- Live smoke test passed (register → farm → link helper → Hindi message → Help me → notification)
- Live Open-Meteo check passed (Nashik, black soil, potato → "Irrigate now", 7 % usable water, 0 mm rain forecast)

## Known notes
- Python packages install slowly on this machine; run pip in the background if it times out.
- `npm audit` reports dev-dependency advisories (vite/vitest dev server only) — not shipped to production.
