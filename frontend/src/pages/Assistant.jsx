import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api'
import ModeBadge from '../components/ModeBadge.jsx'
import { canSpeak, speak, stopSpeaking } from '../lib/speak'

// Browser speech-to-text (Chrome / Edge). Needs internet.
const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
const cleanForSpeech = (txt) => txt.replace(/[*_#`>]/g, ' ').replace(/\p{Extended_Pictographic}/gu, ' ')
function readAutoSetting() {
  try { return localStorage.getItem('farmguard_auto_speak') !== '0' } catch { return true }
}

export default function Assistant() {
  const { t, i18n } = useTranslation()
  const { user, actingFor, farmerParam } = useAuth()
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  const [intro, setIntro] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef(null)
  const recRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState('')
  const [autoSpeak, setAutoSpeak] = useState(readAutoSetting)
  const [speakingIdx, setSpeakingIdx] = useState(null)
  const blocked = user.role === 'helper' && !actingFor

  useEffect(() => {
    api('/assistant/intro', { params: { language: lang } }).then(setIntro).catch(() => {})
  }, [lang])
  // Stop mic + voice when leaving the page or changing language.
  useEffect(() => () => { recRef.current?.abort(); stopSpeaking() }, [])
  useEffect(() => { stopSpeaking(); setSpeakingIdx(null) }, [lang])

  const sayMessage = (idx, content) => {
    if (speakingIdx === idx) { stopSpeaking(); setSpeakingIdx(null); return }
    setSpeakingIdx(idx)
    speak(cleanForSpeech(content), lang, { onEnd: () => setSpeakingIdx((k) => (k === idx ? null : k)) })
  }

  const toggleAuto = () => {
    setAutoSpeak((v) => {
      try { localStorage.setItem('farmguard_auto_speak', v ? '0' : '1') } catch { /* ignore */ }
      if (v) { stopSpeaking(); setSpeakingIdx(null) }
      return !v
    })
  }

  const startMic = () => {
    if (listening) { recRef.current?.stop(); return }
    if (!Recognition) { setMicError(t('assistant.micUnsupported')); return }
    if (!navigator.onLine) { setMicError(t('assistant.micOffline')); return }
    stopSpeaking(); setSpeakingIdx(null); setMicError('')
    const rec = new Recognition()
    rec.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'
    rec.interimResults = true
    rec.maxAlternatives = 1
    let finalText = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      setText((finalText + interim).trim())
    }
    rec.onerror = (e) => {
      setMicError(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? t('assistant.micDenied')
        : e.error === 'no-speech' ? t('assistant.micNoSpeech')
        : e.error === 'network' ? t('assistant.micOffline') : t('assistant.micUnsupported'))
    }
    rec.onend = () => {
      setListening(false)
      recRef.current = null
      if (finalText.trim()) send(finalText)
    }
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' }) // block body: must not return a value
  }, [msgs])

  const send = async (q) => {
    const message = (q ?? text).trim()
    if (!message || busy) return
    setText('')
    const history = msgs.map(({ role, content }) => ({ role, content }))
    setMsgs((m) => [...m, { role: 'user', content: message }])
    setBusy(true)
    try {
      const r = await api('/assistant/ask', { method: 'POST', params: farmerParam, body: { message, language: lang, history } })
      setMsgs((m) => {
        const next = [...m, { role: 'assistant', content: r.answer, mode: r.mode, source: r.source, link: r.link }]
        if (autoSpeak && canSpeak()) sayMessage(next.length - 1, r.answer)
        return next
      })
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', content: e.message, mode: 'fallback' }])
    } finally {
      setBusy(false)
    }
  }

  if (blocked) return <div className="card">{t('dashboard.selectFarmer')}</div>

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col gap-3 md:h-[calc(100vh-7rem)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">💬 {t('nav.assistant')}</h1>
        {canSpeak() && (
          <button type="button" onClick={toggleAuto} aria-pressed={autoSpeak}
            className={`nav-pill text-sm ${autoSpeak ? 'bg-forest-900 text-cream-50' : 'bg-cream-200 text-forest-900'}`}>
            {autoSpeak ? '🔊' : '🔇'} {autoSpeak ? t('assistant.autoOn') : t('assistant.autoOff')}
          </button>
        )}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white p-3 ring-1 ring-gray-100">
        {intro && <div className="max-w-[85%] rounded-2xl bg-brand-50 p-3 text-sm">{intro.greeting}</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] space-y-1 rounded-2xl p-3 text-sm ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-gray-100'}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.role === 'assistant' && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {m.mode && <ModeBadge mode={m.mode} source={m.source} />}
                  {canSpeak() && (
                    <button type="button" onClick={() => sayMessage(i, m.content)}
                      className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-forest-900 ring-1 ring-cream-300">
                      {speakingIdx === i ? `⏹️ ${t('schemes.stop')}` : `🔊 ${t('assistant.listen')}`}
                    </button>
                  )}
                  {m.link && <Link to={m.link} className="text-xs font-semibold text-brand-700 underline">{t('assistant.open')} →</Link>}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="text-sm text-gray-500">… {t('assistant.thinking')}</div>}
        <div ref={end} />
      </div>
      {intro && msgs.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {intro.suggestions.map((s) => (
            <button key={s} onClick={() => send(s)} className="rounded-full border border-brand-600 px-3 py-1 text-sm text-brand-700">{s}</button>
          ))}
        </div>
      )}
      {(listening || micError) && (
        <div className={`rounded-2xl px-3 py-2 text-sm ${micError ? 'bg-red-50 text-red-700' : 'bg-accent-50 text-accent-700'}`}>
          {micError || `🎙️ ${t('assistant.listening')}`}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex gap-2">
        <button type="button" onClick={startMic} disabled={busy} aria-pressed={listening} title={t('assistant.mic')} aria-label={t('assistant.mic')}
          className={`btn shrink-0 px-4 ${listening ? 'animate-pulse bg-red-600 text-white' : 'bg-accent-500 text-white hover:bg-accent-600'}`}>
          {listening ? '⏹️' : '🎤'}
        </button>
        <input className="input" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder={t('assistant.placeholder')} aria-label={t('assistant.placeholder')} />
        <button className="btn-primary" disabled={busy || !text.trim()}>{t('assistant.send')}</button>
      </form>
      <p className="text-[11px] text-gray-400">{t('assistant.disclaimer')}</p>
    </div>
  )
}
