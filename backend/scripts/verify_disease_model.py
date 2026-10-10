"""Check the bundled offline disease model on the example leaf photos (same preprocessing as the browser).

Usage (needs `pip install onnxruntime`):  python scripts/verify_disease_model.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

MODEL_DIR = Path(__file__).resolve().parents[2] / "frontend" / "public" / "models" / "disease"
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
EXPECTED = {
    "tomato_late_blight.jpg": "Tomato___Late_blight", "apple_apple_scab.jpg": "Apple___Apple_scab",
    "corn_common_rust.jpg": "Corn_(maize)___Common_rust_", "grape_black_rot.jpg": "Grape___Black_rot",
    "potato_early_blight.jpg": "Potato___Early_blight", "pepper_bell_healthy.jpg": "Pepper,_bell___healthy",
}


def preprocess(img: Image.Image) -> np.ndarray:
    img = img.convert("RGB")
    s = 256 / min(img.size)
    w, h = round(img.width * s), round(img.height * s)
    img = img.resize((w, h), Image.BICUBIC)
    left, top = (w - 224) // 2, (h - 224) // 2
    arr = np.asarray(img.crop((left, top, left + 224, top + 224)), dtype=np.float32) / 255.0
    return ((arr - MEAN) / STD).transpose(2, 0, 1)[None]


def main() -> int:
    import onnxruntime as ort

    meta = json.loads((MODEL_DIR / "meta.json").read_text())
    centroids = np.fromfile(MODEL_DIR / "centroids.f32", dtype=np.float32).reshape(len(meta["labels"]), meta["dim"])
    sess = ort.InferenceSession(str(MODEL_DIR / "model.onnx"))
    ok = True

    def run(img, name, expect=None):
        nonlocal ok
        logits, feats = sess.run(["logits", "features"], {"pixel_values": preprocess(img)})
        p = np.exp(logits[0] - logits[0].max()); p /= p.sum()
        f = feats[0] / np.linalg.norm(feats[0])
        sim = float((centroids @ f).max())
        best = int(p.argmax())
        label = meta["labels"][best]
        rejected = sim < meta["threshold"]
        verdict = "REJECTED" if rejected else "ok"
        good = (label == expect and not rejected) if expect else rejected
        ok &= good
        print(f"{'PASS' if good else 'FAIL'}  {name:26s} -> {label:40s} {p[best]*100:5.1f}%  sim={sim:.3f} {verdict}")

    for file, expect in EXPECTED.items():
        run(Image.open(MODEL_DIR / "examples" / file), file, expect)
    run(Image.new("RGB", (256, 256), (30, 90, 200)), "blue_square (not a leaf)")
    print("ALL PASS" if ok else "SOME FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
