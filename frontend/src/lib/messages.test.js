import { describe, expect, it } from 'vitest'
import { catalog, renderMessage, templateTitle, whatsappLink } from './messages'

describe('message templates', () => {
  it('renders English with translated crop/item names', () => {
    expect(renderMessage('need_fertilizer', { quantity: 50, item: 'urea', crop: 'wheat' }, 'en')).toBe(
      '🛒 Please buy 50 kg of Urea. Needed for Wheat.',
    )
  })

  it('renders Hindi with translated names', () => {
    const hi = renderMessage('need_fertilizer', { quantity: 50, item: 'urea', crop: 'wheat' }, 'hi')
    expect(hi).toContain('यूरिया')
    expect(hi).toContain('गेहूँ')
  })

  it('has every template in both languages', () => {
    for (const t of [...catalog.quick, ...catalog.alerts]) {
      for (const lang of ['en', 'hi']) {
        expect(templateTitle(t.id, lang)).toBeTruthy()
        expect(() => renderMessage(t.id, {}, lang)).not.toThrow()
      }
    }
  })

  it('builds WhatsApp links with India country code', () => {
    expect(whatsappLink('hello world', '98765 43210')).toBe('https://wa.me/919876543210?text=hello%20world')
  })
})
