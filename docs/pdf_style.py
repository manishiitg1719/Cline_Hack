"""Shared ReportLab styles/helpers for the FarmGuard judges PDF."""
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, Table, TableStyle

GREEN = colors.HexColor("#15803d")
LIGHT = colors.HexColor("#E8F5E9")
GREY = colors.HexColor("#555555")
W = A4[0] - 32 * mm

ss = getSampleStyleSheet()
TITLE = ParagraphStyle("T", parent=ss["Title"], textColor=GREEN, fontSize=28, spaceAfter=2)
SUB = ParagraphStyle("S", parent=ss["Normal"], alignment=TA_CENTER, textColor=GREY, fontSize=11, leading=15)
H2 = ParagraphStyle("H2", parent=ss["Heading2"], textColor=GREEN, fontSize=13, spaceBefore=7, spaceAfter=3)
BODY = ParagraphStyle("B", parent=ss["Normal"], fontSize=9.3, leading=12.5)
CELL = ParagraphStyle("C", parent=BODY, fontSize=8.6, leading=11.2)
CELL_B = ParagraphStyle("CB", parent=CELL, fontName="Helvetica-Bold")
HEAD = ParagraphStyle("HD", parent=CELL, fontName="Helvetica-Bold", textColor=colors.white)


def table(rows, ratios):
    data = [[Paragraph(c, HEAD if r == 0 else (CELL_B if i == 0 else CELL)) for i, c in enumerate(row)]
            for r, row in enumerate(rows)]
    t = Table(data, colWidths=[W * x for x in ratios], repeatRows=1)
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#BDBDBD")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
    ]))
    return t


def bullets(items):
    return [Paragraph(f"&bull; {i}", BODY) for i in items]


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GREY)
    canvas.drawString(16 * mm, 9 * mm, "FarmGuard - working prototype overview for judges")
    canvas.drawRightString(A4[0] - 16 * mm, 9 * mm, f"Page {doc.page}")
    canvas.restoreState()
