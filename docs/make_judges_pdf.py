"""FarmGuard judges PDF (describes the BUILT and TESTED prototype).
Run (from repo root or docs/):  python docs/make_judges_pdf.py  ->  docs/FarmGuard_Judges_Overview.pdf
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from reportlab.lib.pagesizes import A4  # noqa: E402
from reportlab.lib.units import mm  # noqa: E402
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer  # noqa: E402

from pdf_sections import features, intro  # noqa: E402
from pdf_style import BODY, H2, SUB, bullets, footer, table  # noqa: E402

OUT = Path(__file__).with_name("FarmGuard_Judges_Overview.pdf")


def closing():
    s = [
        Paragraph("4. LIVE / FALLBACK: never breaks, never fakes", H2),
        Paragraph("Every feature works with an online service (LIVE) and without one (FALLBACK: last saved forecast, built-in "
                  "data, on-device AI). Each result shows a badge with its source; a System Status page lists all services. "
                  "AI use has a daily limit to protect credits. Demo data is always labelled.", BODY),
        Paragraph("5. Proof it works", H2),
        table([
            ["Check", "Result"],
            ["Automated tests", "83 backend (pytest) + 18 frontend (vitest), all passing; Hindi/English completeness tested"],
            ["Offline disease model", "7/7 test photos correct in a real browser, also with all model files blocked (served from phone cache)"],
            ["Radar (real weather)", "7 demo farms near Ludhiana gave OUTBREAK; Hindi alert to farmer, English to neighbour and helper"],
            ["Crop Advisor (real data)", "Ludhiana, after rice: Rabi gave chickpea / mustard / wheat; Kharif gave cotton / pigeon pea / groundnut"],
            ["Satellite (real data)", "Rice field greenness 0.12 (June) to 0.45 (Sept) to 0.27 (Oct harvest), matching the real crop cycle"],
            ["Offline app (PWA)", "App opens with the network switched off after the first visit"],
        ], [0.27, 0.73]),
        Paragraph("6. Technology (free and open)", H2),
        Paragraph("React + Vite + Tailwind + Leaflet (PWA) | FastAPI + SQLite | ONNX Runtime Web (DINOv2-small, CC BY-SA 4.0) | "
                  "scikit-learn DBSCAN | Open-Meteo, ISRIC SoilGrids, Sentinel-2 via Microsoft Planetary Computer | "
                  "any OpenAI-compatible AI (optional). No paid API is required.", BODY),
        Paragraph("7. Honest limitations", H2),
    ]
    s += bullets([
        "Disease model knows 14 crops (PlantVillage); field photos score lower than lab accuracy (98.7%). No rice/wheat diseases yet.",
        "Radar needs many users in an area; until then weather-only disease risk works for every farmer.",
        "Soil maps are 250 m estimates; satellite analyses a ~330 m box, not exact field boundaries; monsoon clouds block images.",
        "Prices/yields are estimates (Kharif MSPs to be re-verified). WhatsApp messages are pre-filled; the user presses Send.",
    ])
    s += [Spacer(1, 5), Paragraph("<font color='#15803d'><b>FarmGuard: smart when online, helpful when offline, "
                                  "always in the farmer's language.</b></font>", SUB)]
    return s


if __name__ == "__main__":
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=16 * mm, rightMargin=16 * mm, topMargin=13 * mm,
                            bottomMargin=14 * mm, title="FarmGuard - Judges Overview", author="FarmGuard Team")
    doc.build(intro() + features() + closing(), onFirstPage=footer, onLaterPages=footer)
    print("Created:", OUT)
