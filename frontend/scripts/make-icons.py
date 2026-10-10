"""Generate PNG app icons (192/512) for the PWA manifest with Pillow (same design as public/icons/icon.svg).
Run: python scripts/make-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "public" / "icons"
GREEN, LIGHT, MID, BRIGHT = "#15803d", "#dcfce7", "#16a34a", "#22c55e"


def draw(size: int) -> Image.Image:
    s = size / 512
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(96 * s), fill=GREEN)
    shield = [(256, 80), (400, 140), (400, 250), (370, 330), (256, 432), (142, 330), (112, 250), (112, 140)]
    d.polygon([(x * s, y * s) for x, y in shield], fill=LIGHT)
    d.line([(256 * s, 380 * s), (256 * s, 200 * s)], fill=GREEN, width=max(2, int(18 * s)))
    d.ellipse([186 * s, 214 * s, 256 * s, 300 * s], fill=MID)
    d.ellipse([256 * s, 174 * s, 326 * s, 260 * s], fill=BRIGHT)
    return img


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for size in (192, 512):
        draw(size).save(OUT / f"icon-{size}.png")
        print("wrote", OUT / f"icon-{size}.png")
