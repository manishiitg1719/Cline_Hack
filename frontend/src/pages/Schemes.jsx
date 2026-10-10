import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import ShareButtons from '../components/ShareButtons.jsx'
import { canSpeak, speak, stopSpeaking } from '../lib/speak'

const list = (x) => (Array.isArray(x) ? x : x ? [x] : [])

// Build the text that is read aloud.
function speechText(s, t, part) {
  const join = (arr) => list(arr).join('. ')
  const who = `${s.name}. ${t('schemes.eligible')}: ${join(s.eligible) || s.who}. ${
    list(s.not_eligible).length ? `${t('schemes.notEligible')}: ${join(s.not_eligible)}.` : ''
  }`
  if (part === 'who') return who
  return [
    `${s.name}.`,
    s.about,
    `${t('schemes.benefits')}: ${join(s.benefits) || s.benefit}.`,
    `${t('schemes.eligible')}: ${join(s.eligible) || s.who}.`,
    list(s.not_eligible).length ? `${t('schemes.notEligible')}: ${join(s.not_eligible)}.` : '',
    list(s.documents).length ? `${t('schemes.documents')}: ${join(s.documents)}.` : '',
    `${t('schemes.how')}: ${join(s.steps) || s.how}.`,
    s.timing ? `${t('schemes.timing')}: ${s.timing}` : '',
    s.helpline ? `${t('schemes.helpline')}: ${s.helpline}` : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function Section({ icon, title, items, ordered, tone = '' }) {
  const arr = list(items)
  if (!arr.length) return null
  const Tag = ordered ? 'ol' : 'ul'
  return (
    <div className={`rounded-2xl p-4 ${tone || 'bg-cream-50 ring-1 ring-cream-200'}`}>
      <h3 className="mb-2 font-bold text-forest-900">{icon} {title}</h3>
      <Tag className={`space-y-1.5 pl-5 text-[15px] leading-relaxed text-gray-800 ${ordered ? 'list-decimal' : 'list-disc'}`}>
        {arr.map((x, i) => <li key={i}>{x}</li>)}
      </Tag>
    </div>
  )
}

export default function Schemes() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  const [speaking, setSpeaking] = useState(null) // `${id}:${part}`
  const [voiceWarn, setVoiceWarn] = useState('')

  useEffect(() => {
    api('/schemes', { params: { language: lang } }).then(setData).catch((e) => setError(e.message))
  }, [lang, t])

  // Stop talking when leaving the page or switching language.
  useEffect(() => {
    stopSpeaking()
    setSpeaking(null)
    return () => stopSpeaking()
  }, [lang])

  async function listen(s, part) {
    const key = `${s.id}:${part}`
    if (speaking === key) {
      stopSpeaking()
      setSpeaking(null)
      return
    }
    setSpeaking(key)
    const { hasVoice } = await speak(speechText(s, t, part), lang, { onEnd: () => setSpeaking((k) => (k === key ? null : k)) })
    setVoiceWarn(!hasVoice && lang === 'hi' ? t('schemes.noHindiVoice') : '')
  }

  const VoiceBtn = ({ s, part, label }) => {
    const on = speaking === `${s.id}:${part}`
    return (
      <button
        type="button"
        onClick={() => listen(s, part)}
        className={`btn text-sm ${on ? 'bg-forest-900 text-cream-50' : 'bg-accent-500 text-white hover:bg-accent-600'}`}
        aria-pressed={on}
      >
        {on ? '⏹️ ' + t('schemes.stop') : '🔊 ' + label}
      </button>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] bg-forest-900 p-6 text-cream-50 shadow-lg md:p-8">
        <div className="eyebrow text-accent-300">🏛️ {t('schemes.eyebrow')}</div>
        <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">{t('nav.schemes')}</h1>
        <p className="mt-2 max-w-2xl text-cream-100/90">{t('schemes.intro')}</p>
        {canSpeak() ? (
          <p className="mt-3 text-sm text-accent-300">{t('schemes.voiceHint')}</p>
        ) : (
          <p className="mt-3 text-sm text-red-200">{t('schemes.noSpeech')}</p>
        )}
      </div>

      {voiceWarn && <div className="card border-l-4 border-accent-500 text-sm">{voiceWarn}</div>}
      {error && <div className="card text-red-700">{error}</div>}

      <div className="grid gap-4">
        {data?.schemes.map((s) => {
          const isOpen = open === s.id
          return (
            <div key={s.id} className="card space-y-3 p-5">
              <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen(isOpen ? null : s.id)}>
                <span className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-100 text-2xl">{s.icon}</span>
                  <span>
                    <span className="block text-xl font-extrabold text-forest-900">{s.name}</span>
                    <span className="mt-1 block text-[15px] text-gray-700">{s.benefit}</span>
                  </span>
                </span>
                <span className="mt-1 text-forest-700">{isOpen ? '▲' : '▼'}</span>
              </button>

              {canSpeak() && (
                <div className="flex flex-wrap gap-2">
                  <VoiceBtn s={s} part="who" label={t('schemes.listenWho')} />
                  <VoiceBtn s={s} part="all" label={t('schemes.listenAll')} />
                </div>
              )}

              {isOpen && (
                <div className="space-y-3 pt-1">
                  {s.about && <p className="text-[15px] leading-relaxed text-gray-800">{s.about}</p>}
                  <div className="grid gap-3 md:grid-cols-2">
                    <Section icon="🎁" title={t('schemes.benefits')} items={list(s.benefits).length ? s.benefits : s.benefit} />
                    <Section icon="✅" title={t('schemes.eligible')} items={list(s.eligible).length ? s.eligible : s.who} tone="bg-sage-100 ring-1 ring-sage-200" />
                    <Section icon="🚫" title={t('schemes.notEligible')} items={s.not_eligible} tone="bg-red-50 ring-1 ring-red-100" />
                    <Section icon="📄" title={t('schemes.documents')} items={s.documents} />
                  </div>
                  <Section icon="📝" title={t('schemes.how')} items={list(s.steps).length ? s.steps : s.how} ordered />
                  <div className="grid gap-3 md:grid-cols-2">
                    {s.timing && (
                      <div className="rounded-2xl bg-accent-50 p-4 ring-1 ring-accent-100">
                        <h3 className="mb-1 font-bold text-forest-900">📅 {t('schemes.timing')}</h3>
                        <p className="text-[15px] text-gray-800">{s.timing}</p>
                      </div>
                    )}
                    {s.helpline && (
                      <div className="rounded-2xl bg-accent-50 p-4 ring-1 ring-accent-100">
                        <h3 className="mb-1 font-bold text-forest-900">📞 {t('schemes.helpline')}</h3>
                        <p className="text-[15px] text-gray-800">{s.helpline}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={s.url} target="_blank" rel="noreferrer" className="btn-outline inline-flex text-sm">🔗 {t('schemes.official')}</a>
                    <ShareButtons text={`${s.icon} ${s.name}: ${s.benefit} ${s.url}`} />
                  </div>
                </div>
              )}
              {!isOpen && (
                <button className="text-sm font-semibold text-accent-600 underline" onClick={() => setOpen(s.id)}>
                  {t('schemes.readMore')}
                </button>
              )}
            </div>
          )
        })}
      </div>
      {data && <p className="text-[11px] text-gray-500">{t('schemes.note', { date: data.last_checked })}</p>}
    </div>
  )
}
