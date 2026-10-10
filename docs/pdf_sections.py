"""Content of the FarmGuard judges PDF, part 1 (problem, new idea, features)."""
from reportlab.platypus import Paragraph, Spacer

from pdf_style import BODY, H2, SUB, TITLE, table

LIVE = "<font color='#15803d'><b>LIVE</b></font>"
FB = "<font color='#EA580C'><b>FALLBACK</b></font>"


def intro():
    return [
        Paragraph("FarmGuard", TITLE),
        Paragraph("A working farming app for Indian smallholders: right crop, healthy field, smart watering, early "
                  "disease warnings for the whole village, and one-tap messages to family, in Hindi and English.", SUB),
        Spacer(1, 6),
        Paragraph("1. Problem and our answer", H2),
        table([
            ["Farmer's problem", "What FarmGuard does (working today)"],
            ["Which crop suits my soil and season?", "Crop Advisor: soil map + last year's weather + Soil Health Card gives Top-3 crops with yield, profit, reasons and a 3-season rotation"],
            ["Disease is seen late; no internet in the field", "Offline Disease Scan: AI runs on the phone (26 diseases, 14 crops), treatment in Hindi/English"],
            ["Disease spreads farm to farm", "Village Disease Radar: scans from many farms + weather spread risk warn nearby farmers early"],
            ["Over- or under-watering", "Irrigation advice: Irrigate now / Delay / No need, with litres for your land (FAO-56 method)"],
            ["Can't see crop stress across the field", "Satellite Field Health: free Sentinel-2 images give a greenness score, trend and weak-patch warning"],
            ["Not comfortable with smartphones", "Family Helper mode + pre-written messages: tap, the message is written, send on WhatsApp/SMS"],
        ], [0.36, 0.64]),
        Paragraph("2. Our new idea: Village Disease Radar", H2),
        Paragraph("Every offline leaf scan becomes an anonymous data point (location rounded to ~1 km, no photo, no name). "
                  "The server groups nearby farms reporting the same disease (DBSCAN clustering, <b>one vote per farm</b>), checks if "
                  "the next 3 days' weather favours its spread (e.g. <b>Hutton criteria</b> for late blight), and warns only farmers "
                  "<b>growing that crop</b> nearby, plus their family helpers, each in their own language. "
                  "A diagnosis tool becomes an early-warning network for the village.", BODY),
    ]


def features():
    return [
        Paragraph("3. Features (all built, tested, Hindi + English)", H2),
        table([
            ["Feature", "What judges will see", "Mode"],
            ["Offline Disease Scan", "Leaf photo, result in under 1 s with internet OFF; rejects non-leaf photos; treatment guide; history; share", f"{FB} on-device"],
            ["Village Disease Radar", "Map of anonymous cases + outbreak circles; Watch / Warning / Outbreak; alerts; DEMO mode clearly labelled", f"{LIVE} weather / {FB} saved"],
            ["Smart Crop Advisor", "4-step wizard; Top-3 crops, % match, yield, profit/acre, sowing window, reasons, soil tips, rotation plan", f"{LIVE} SoilGrids + archive"],
            ["Soil Health Card", "AI reads the card photo, or the farmer types 5 numbers", f"{LIVE} AI / {FB} manual"],
            ["Irrigation + Weather", "7-day forecast, heavy-rain/heat/wind warnings, irrigation decision with reasons and litres", f"{LIVE} Open-Meteo / {FB} saved"],
            ["Satellite Field Health", "Score 0-100, NDVI/NDMI, 6-month chart, 'dropping' / 'patchy' / 'dry' warnings", f"{LIVE} Sentinel-2 / {FB} estimate"],
            ["Family Helper", "6-digit link code, helper acts for farmer, view/edit permission, Help-me button", "always"],
            ["Quick Messages", "Tap template, blanks from dropdowns, auto-written in contact's language, WhatsApp / SMS", "always (offline)"],
            ["Farming Assistant", "Chat in Hindi/English from the farmer's own data + built-in FAQ; AI when a key is added", f"{LIVE} AI / {FB} FAQ"],
            ["Schemes, Rent and Waste", "8 government schemes with official links; rent tractors and sell straw nearby via WhatsApp", "always"],
            ["Installable PWA", "Installs on a phone and opens with no internet (service worker)", "offline"],
        ], [0.22, 0.58, 0.20]),
    ]
