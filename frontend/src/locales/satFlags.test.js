import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import en from './en.json'
import hi from './hi.json'

// Every flag/status the backend field_health service can emit must be translated.
const py = fs.readFileSync(path.resolve(__dirname, '../../../backend/app/services/field_health.py'), 'utf8')

describe('field health translations', () => {
  it('translates every status and flag', () => {
    const statuses = [...py.matchAll(/status = "([a-z_]+)"/g)].map((m) => m[1])
    const flags = [...py.matchAll(/flags\.append\("([a-z_]+)"\)/g)].map((m) => m[1])
    expect(statuses.length).toBeGreaterThanOrEqual(4)
    expect(flags.length).toBeGreaterThanOrEqual(6)
    for (const s of statuses) expect(en.sat.status[s] && hi.sat.status[s], s).toBeTruthy()
    for (const f of flags) expect(en.sat.flag[f] && hi.sat.flag[f], f).toBeTruthy()
  })
})
