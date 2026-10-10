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

  it('renders disease labels and model crop keys as readable names', () => {
    const p = { disease: 'Potato___Late_blight', farms: 6, radius: 4, risk: 'high', crop: 'potato' }
    expect(renderMessage('radar_outbreak', p, 'en')).toContain('Potato late blight found on 6 farms')
    expect(renderMessage('radar_outbreak', p, 'hi')).toContain('आलू का पछेती झुलसा')
    // crop only in the disease KB (not in the message crop list) still gets a name
    expect(renderMessage('radar_outbreak', { ...p, crop: 'pepper' }, 'hi')).toContain('शिमला मिर्च')
  })

  it('builds WhatsApp links with India country code', () => {
    expect(whatsappLink('hello world', '98765 43210')).toBe('https://wa.me/919876543210?text=hello%20world')
  })
})
