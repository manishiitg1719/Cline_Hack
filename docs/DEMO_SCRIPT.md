# FarmGuard — 5-minute judges demo

## Before the judges arrive (2 min)
```powershell
cd D:\Cline_Hackathon\backend;  python -m uvicorn app.main:app --port 8000      # terminal 1
cd D:\Cline_Hackathon\frontend; npm run dev                                       # terminal 2
cd D:\Cline_Hackathon\backend;  python scripts/seed_demo.py                       # once
```
- Open **http://localhost:5173** in two browser windows (or phone + laptop):
  - Window A: **Farmer** `9999900001` / `demo1234` (Hindi)
  - Window B: **Helper (son)** `9999900002` / `demo1234` (English) → Family → "Help this farmer"
- Open **Disease Scan** once while online so the model is saved on the device.

## The story (say this)
> "Gurpreet grows potatoes near Ludhiana. He isn't comfortable with apps, his son lives in the city. FarmGuard helps both."

| # | Time | Do | Point out |
|---|---|---|---|
| 1 | 0:00 | Window A dashboard (Hindi). Red **disease alert banner**, today's weather and irrigation cards | Whole app in Hindi; switch to English with one tap |
| 2 | 0:30 | **Disease Radar** → map with 7 cases + red outbreak circle (labelled DEMO DATA). Weather-risk panel: late blight **High** | "Every scan in the village becomes an early warning. One vote per farm. Weather from Hutton criteria." |
| 3 | 1:15 | Bell 🔔 → alert in **Hindi**. Window B bell → the **same alert in English** for the son | Language bridge: farmer + helpers both warned |
| 4 | 1:45 | **Turn Wi-Fi OFF**. Disease Scan → example photo "Tomato late blight" (or a real leaf) | Result in < 1 s, **no internet**, treatment in Hindi; "pending sync" counter |
| 5 | 2:30 | Wi-Fi ON → scan syncs. **Share → WhatsApp** opens with the message already written | Tap-to-send, no typing |
| 6 | 3:00 | **Crop Advisor**: Rabi → "Not sure" soil → skip card → borewell, profit → Top-3 | Real SoilGrids + last year's weather; reasons, profit/acre, rotation plan |
| 7 | 3:45 | **Field Health** → satellite score + greenness chart | Free Sentinel-2, 10 m, every ~5 days |
| 8 | 4:15 | **Ask FarmGuard**: "क्या आज सिंचाई करूं?" | Answer uses *his* farm's soil moisture & rain forecast (FALLBACK badge = works without AI key) |
| 9 | 4:40 | **System Status** page | LIVE vs FALLBACK for every service — never breaks, never fakes |
| 10 | 4:55 | Close: "Smart when online, helpful when offline, always in the farmer's language." | |

## If something goes wrong
- No internet at the venue → everything shows **FALLBACK** badges; Disease Scan, messages, schemes, FAQ assistant still work. Say so — it's the point of the design.
- Radar empty → Radar page → 🧪 Demo mode → "Add demo cases".
- Reset demo: `python scripts/seed_demo.py` again (safe to re-run).

## Questions judges may ask
- **Accuracy?** 98.7% on unseen lab leaves (model card); lower in the field — that's why low-confidence results ask for a new photo and non-leaf images are rejected.
- **Privacy?** Only disease result + location rounded to ~1 km are shared; no photo/name. Scans can be deleted; demo data is labelled.
- **Cost?** All data sources are free (Open-Meteo, SoilGrids, Planetary Computer). AI is optional with a daily cap.
- **Scale?** Radar runs hourly on the server (DBSCAN, milliseconds for thousands of scans); the model runs on the phone, so no GPU servers.
