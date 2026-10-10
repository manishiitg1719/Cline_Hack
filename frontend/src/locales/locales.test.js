import { describe, expect, it } from 'vitest'
import en from './en.json'
import hi from './hi.json'

const keys = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([k, v]) => (v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]))

describe('UI translations', () => {
  it('English and Hindi have exactly the same keys', () => {
    const enKeys = keys(en).sort()
    const hiKeys = keys(hi).sort()
    expect(enKeys.filter((k) => !hiKeys.includes(k))).toEqual([])
    expect(hiKeys.filter((k) => !enKeys.includes(k))).toEqual([])
  })
})
