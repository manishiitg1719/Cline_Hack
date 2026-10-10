import { describe, expect, it } from 'vitest'
import { cropGeometry, interpret, maxCentroidSimilarity, parseLabel, softmax, toCHW } from './diseaseMath'
import meta from '../../public/models/disease/meta.json'
import kbEn from '@shared/disease/kb_en.json'
import kbHi from '@shared/disease/kb_hi.json'

describe('disease maths', () => {
  it('softmax sums to 1 and keeps order', () => {
    const p = softmax([1, 2, 3])
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1)
    expect(p[2]).toBeGreaterThan(p[1])
  })

  it('normalises pixels to CHW with ImageNet stats', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255])
    const out = toCHW(rgba, 1)
    expect(out[0]).toBeCloseTo((1 - 0.485) / 0.229)
    expect(out[1]).toBeCloseTo((0 - 0.456) / 0.224)
  })

  it('computes centre-crop geometry like the HF processor', () => {
    expect(cropGeometry(512, 256)).toEqual({ dx: -144, dy: -16, w: 512, h: 256 })
  })

  it('cosine similarity to centroids', () => {
    const centroids = new Float32Array([1, 0, 0, 1])
    expect(maxCentroidSimilarity([3, 4], centroids, 2, 2)).toBeCloseTo(0.8)
  })

  it('parses labels', () => {
    expect(parseLabel('Corn_(maize)___Common_rust_')).toEqual({ crop: 'maize', healthy: false })
    expect(parseLabel('Tomato___healthy')).toEqual({ crop: 'tomato', healthy: true })
  })

  it('interprets: rejected, unsure, healthy, disease', () => {
    const labels = ['Potato___Late_blight', 'Potato___healthy']
    expect(interpret([0.9, 0.1], 0.5, labels, 0.7).status).toBe('rejected')
    expect(interpret([0.45, 0.55], 0.9, labels, 0.7, 0.6).status).toBe('unsure')
    expect(interpret([0.1, 0.9], 0.9, labels, 0.7).status).toBe('healthy')
    const r = interpret([0.92, 0.08], 0.9, labels, 0.7)
    expect(r.status).toBe('disease')
    expect(r.crop).toBe('potato')
    expect(r.top[0].label).toBe('Potato___Late_blight')
  })
})

describe('treatment knowledge base', () => {
  const diseases = meta.labels.filter((l) => !l.endsWith('healthy'))
  it('covers every disease class of the model in English and Hindi', () => {
    expect(meta.labels).toHaveLength(38)
    for (const l of diseases) {
      for (const kb of [kbEn, kbHi]) {
        const e = kb.classes[l]
        expect(e, l).toBeTruthy()
        for (const f of ['name', 'symptoms', 'cause', 'treatment', 'prevention']) expect(e[f], `${l}.${f}`).toBeTruthy()
      }
    }
  })
  it('has every crop name in both languages', () => {
    for (const l of meta.labels) {
      const { crop } = parseLabel(l)
      expect(kbEn.crop_names[crop], crop).toBeTruthy()
      expect(kbHi.crop_names[crop], crop).toBeTruthy()
    }
  })
})
