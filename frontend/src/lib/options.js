import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import enMessages from '@shared/messages/en.json'
import hiMessages from '@shared/messages/hi.json'

export const SOILS = ['', 'alluvial', 'black', 'red', 'laterite', 'sandy', 'clay', 'loamy']
export const WATERS = ['rain', 'canal', 'borewell', 'drip']
export const CROP_KEYS = Object.keys(enMessages.crops)

export const MESSAGE_STRINGS = { en: enMessages, hi: hiMessages }

/** Shared message dictionary (crops, items, templates…) in the current UI language. */
export function useMessageStrings() {
  const { i18n } = useTranslation()
  const [lang, setLang] = useState(i18n.language)
  useEffect(() => setLang(i18n.language), [i18n.language])
  return MESSAGE_STRINGS[lang === 'hi' ? 'hi' : 'en']
}
