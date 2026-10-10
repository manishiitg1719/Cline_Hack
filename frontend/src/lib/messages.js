// Frontend twin of backend/app/services/messages.py — renders the shared
// pre-written templates so a message is "written by itself" in any language.
import catalogJson from '@shared/messages/templates.json'
import kbEn from '@shared/disease/kb_en.json'
import kbHi from '@shared/disease/kb_hi.json'
import { MESSAGE_STRINGS } from './options'

export const catalog = catalogJson
const DICT_SECTION = { crop: 'crops', item: 'items', issue: 'issues', risk: 'risk' }
const KB = { en: kbEn, hi: kbHi }

export function templateMeta(id) {
  return [...catalog.quick, ...catalog.alerts].find((t) => t.id === id)
}

export function renderMessage(id, params = {}, lang = 'en') {
  const strings = MESSAGE_STRINGS[lang] || MESSAGE_STRINGS.en
  const meta = templateMeta(id)
  if (!meta) throw new Error(`Unknown template: ${id}`)
  const kb = KB[lang] || KB.en
  const text = strings.templates[id].text.replace(/\{(\w+)\}/g, (_, key) => {
    let value = params[key] ?? ''
    const type = meta.params[key]
    const section = DICT_SECTION[type]
    if (type === 'disease' && typeof value === 'string') value = kb.classes[value]?.name ?? value
    else if (section && typeof value === 'string')
      value = strings[section][value] ?? (type === 'crop' ? kb.crop_names[value] : undefined) ?? value
    return String(value)
  })
  return text.replace(/\s{2,}/g, ' ').trim()
}

export function templateTitle(id, lang = 'en') {
  return (MESSAGE_STRINGS[lang] || MESSAGE_STRINGS.en).templates[id].title
}

export function whatsappLink(text, phone) {
  let digits = (phone || '').replace(/\D/g, '')
  if (digits.length === 10) digits = `91${digits}` // assume India
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function smsLink(text, phone) {
  return `sms:${phone || ''}?body=${encodeURIComponent(text)}`
}
