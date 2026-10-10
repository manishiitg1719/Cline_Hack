# Offline disease model — attribution & license

Files in this folder (`model.onnx`, `meta.json`, `centroids.f32`, `examples/*.jpg`) are **not** covered by the
project's MIT license. They are third-party material used unchanged:

| File | Source | License |
|---|---|---|
| `model.onnx` (int8 quantized, 24 MB) | [rodynaemad/plant-disease-dinov2-small](https://huggingface.co/rodynaemad/plant-disease-dinov2-small) — `onnx/model_with_features_quantized.onnx` | **CC BY-SA 4.0** (DINOv2 backbone: Apache-2.0) |
| `meta.json`, `centroids.f32`, `examples/*.jpg` | [rodynaemad/plant-disease-scanner](https://huggingface.co/spaces/rodynaemad/plant-disease-scanner) Space | CC BY-SA 4.0 |
| Training data | PlantVillage — Hughes & Salathé (2015), Mohanty, Hughes & Salathé (2016) | CC BY-SA |

Model author: **Rodayna Emad Mohamed**. Reported accuracy: 98.7 % (int8) on PlantVillage leaves never seen in
training. **Lab photos only** — accuracy on real field photos will be lower. Not a diagnosis.

CC BY-SA 4.0 requires attribution (shown in the app on the Disease Scan page) and that redistributed
modifications of these files are shared under the same license.
