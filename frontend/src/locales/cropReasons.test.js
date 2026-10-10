import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import en from './en.json'
import hi from './hi.json'
import crops from '@shared/crops/crops.json'
import msgEn from '@shared/messages/en.json'

// Every reason/blocker/tip code produced by the backend advisor must be translated.
const py = ['crop_advisor.py', 'crop_plan.py']
  .map((f) => fs.readFileSync(path.resolve(__dirname, '../../../backend/app/services', f), 'utf8'))
  .join('\n')

describe('crop advisor translations', () => {
  it('translates every reason code emitted by the backend', () => {
    // response field names, not reason codes
    const FIELD_NAMES = new Set(['water_source', 'soil_type', 'last_crop', 'water_need', 'soil_mode', 'soil_values'])
    const codes = new Set([...py.matchAll(/"((?:temp|ph|rain|water|soil|needs|legume|same|wrong|over)_[a-z_]+)"/g)]
      .map((m) => m[1]).filter((c) => !FIELD_NAMES.has(c)))
    expect(codes.size).toBeGreaterThan(15)
    for (const c of codes) {
      expect(en.crop.reason[c], `en ${c}`).toBeTruthy()
      expect(hi.crop.reason[c], `hi ${c}`).toBeTruthy()
    }
  })
  it('translates every fertilizer tip code', () => {
    for (const c of ['acidic', 'alkaline', 'low_n', 'low_p', 'low_k', 'low_oc']) {
      expect(py).toContain(`"${c}"`)
      expect(en.crop.tip[c] && hi.crop.tip[c]).toBeTruthy()
    }
  })
  it('has a display name for every advisor crop', () => {
    for (const k of Object.keys(crops.crops)) expect(msgEn.crops[k], k).toBeTruthy()
  })
})
