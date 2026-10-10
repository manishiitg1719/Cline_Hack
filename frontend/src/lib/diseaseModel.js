// Offline leaf-disease model running in the browser with ONNX Runtime Web (WASM).
// Model + runtime files are served from our own app (/models/disease, bundled wasm) and stored in the
// browser Cache Storage after the first load → scanning works with no internet afterwards.
// `onnxruntime-web/wasm` = bundled build: the JS glue is inside our chunk; only the .wasm binary is a
// separate file, and we hand it to ORT as bytes (env.wasm.wasmBinary) read from the device cache.
import * as ort from 'onnxruntime-web/wasm'
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url'
import { SIZE, cropGeometry, interpret, maxCentroidSimilarity, softmax, toCHW } from './diseaseMath'

const BASE = '/models/disease'
const CACHE = 'farmguard-model-v1'
export const MODEL_FILES = [`${BASE}/model.onnx`, `${BASE}/meta.json`, `${BASE}/centroids.f32`, wasmUrl]

ort.env.wasm.numThreads = 1 // no cross-origin isolation needed

/** Cache-first fetch: once a file is stored on the device it is never downloaded again.
 *  When the model changes, bump CACHE (e.g. 'farmguard-model-v2') so phones fetch the new files. */
async function cachedFetch(url) {
  const cache = 'caches' in self ? await caches.open(CACHE) : null
  const hit = cache ? await cache.match(url) : null
  if (hit) return hit
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  if (cache) await cache.put(url, res.clone())
  return res
}

/** True when every model file is already stored on this device. */
export async function isModelCached() {
  if (!('caches' in self)) return false
  const cache = await caches.open(CACHE)
  const hits = await Promise.all(MODEL_FILES.map((u) => cache.match(u)))
  return hits.every(Boolean)
}

let loading = null

/** Load once per page; files come from the device cache when available. */
export function loadModel() {
  if (!loading) {
    loading = (async () => {
      const [meta, centroidsBuf, modelBuf, wasmBuf] = await Promise.all([
        cachedFetch(`${BASE}/meta.json`).then((r) => r.json()),
        cachedFetch(`${BASE}/centroids.f32`).then((r) => r.arrayBuffer()),
        cachedFetch(`${BASE}/model.onnx`).then((r) => r.arrayBuffer()),
        cachedFetch(wasmUrl).then((r) => r.arrayBuffer()),
      ])
      ort.env.wasm.wasmBinary = wasmBuf // runtime from device cache → works offline
      const session = await ort.InferenceSession.create(new Uint8Array(modelBuf), { executionProviders: ['wasm'] })
      return { session, meta, centroids: new Float32Array(centroidsBuf) }
    })().catch((e) => {
      loading = null // allow retry
      throw e
    })
  }
  return loading
}

/** Draw image → 224×224 RGBA using shortest-edge 256 + centre crop. */
function imageToPixels(img) {
  const width = img.naturalWidth || img.width
  const height = img.naturalHeight || img.height
  const { dx, dy, w, h } = cropGeometry(width, height)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, dx, dy, w, h)
  return ctx.getImageData(0, 0, SIZE, SIZE).data
}

/** Run the model on an <img> / ImageBitmap and return an interpreted result. */
export async function scanImage(img) {
  const { session, meta, centroids } = await loadModel()
  const input = new ort.Tensor('float32', toCHW(imageToPixels(img)), [1, 3, SIZE, SIZE])
  const out = await session.run({ pixel_values: input })
  const probs = softmax(out.logits.data)
  const sim = maxCentroidSimilarity(out.features.data, centroids, meta.labels.length, meta.dim)
  return interpret(probs, sim, meta.labels, meta.threshold)
}
