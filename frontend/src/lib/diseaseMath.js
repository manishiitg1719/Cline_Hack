// Pure maths for the offline disease model (no browser APIs → unit-testable in Node).
// Model: rodynaemad/plant-disease-dinov2-small (CC BY-SA 4.0), DINOv2-small + linear head, 38 PlantVillage classes.

export const SIZE = 224
export const MEAN = [0.485, 0.456, 0.406]
export const STD = [0.229, 0.224, 0.225]

/** Below this top-class probability we ask for a better photo instead of guessing. */
export const MIN_CONFIDENCE = 0.5

/** RGBA pixels (SIZE×SIZE) → CHW float32, ImageNet-normalised. */
export function toCHW(rgba, size = SIZE) {
  const plane = size * size
  const out = new Float32Array(3 * plane)
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) out[c * plane + i] = (rgba[i * 4 + c] / 255 - MEAN[c]) / STD[c]
  }
  return out
}

/** Shortest edge → 256, centre crop 224 (same as the Hugging Face image processor). */
export function cropGeometry(width, height, size = SIZE, shortest = 256) {
  const s = shortest / Math.min(width, height)
  const w = Math.round(width * s)
  const h = Math.round(height * s)
  return { dx: -Math.floor((w - size) / 2), dy: -Math.floor((h - size) / 2), w, h }
}

export function softmax(logits) {
  const arr = Array.from(logits)
  const m = Math.max(...arr)
  const e = arr.map((v) => Math.exp(v - m))
  const s = e.reduce((a, b) => a + b, 0)
  return e.map((v) => v / s)
}

/** Max cosine similarity of the feature vector to the (unit-norm) class centroids. */
export function maxCentroidSimilarity(features, centroids, numClasses, dim) {
  let norm = 0
  for (let j = 0; j < dim; j++) norm += features[j] * features[j]
  norm = Math.sqrt(norm) || 1
  let best = -1
  for (let k = 0; k < numClasses; k++) {
    let dot = 0
    for (let j = 0; j < dim; j++) dot += centroids[k * dim + j] * features[j]
    best = Math.max(best, dot / norm)
  }
  return best
}

/** "Potato___Late_blight" → { crop: "potato", healthy: false } */
const CROP_KEY = {
  Apple: 'apple', Blueberry: 'blueberry', 'Cherry_(including_sour)': 'cherry', 'Corn_(maize)': 'maize',
  Grape: 'grape', Orange: 'orange', Peach: 'peach', 'Pepper,_bell': 'pepper', Potato: 'potato',
  Raspberry: 'raspberry', Soybean: 'soybean', Squash: 'squash', Strawberry: 'strawberry', Tomato: 'tomato',
}
export function parseLabel(label) {
  const [crop, condition] = label.split('___')
  return { crop: CROP_KEY[crop] || crop.toLowerCase(), healthy: condition === 'healthy' }
}

/**
 * Turn raw model output into a decision.
 * status: 'rejected' (not a leaf like the training photos) | 'unsure' (low confidence) | 'healthy' | 'disease'
 */
export function interpret(probs, similarity, labels, threshold, minConfidence = MIN_CONFIDENCE) {
  const order = [...probs.keys()].sort((a, b) => probs[b] - probs[a])
  const top = order.slice(0, 3).map((i) => ({ label: labels[i], prob: probs[i] }))
  const best = top[0]
  const { crop, healthy } = parseLabel(best.label)
  let status
  if (similarity < threshold) status = 'rejected'
  else if (best.prob < minConfidence) status = 'unsure'
  else status = healthy ? 'healthy' : 'disease'
  return { status, label: best.label, crop, healthy, confidence: best.prob, similarity, top }
}
