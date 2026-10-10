import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api'
import ModeBadge from '../components/ModeBadge.jsx'

export default function Assistant() {
  const { t, i18n } = useTranslation()
  const { user, actingFor, farmerParam } = useAuth()
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  const [intro, setIntro] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef(null)
  const blocked = user.role === 'helper' && !actingFor

  useEffect(() => {
    api('/assistant/intro', { params: { language: lang } }).then(setIntro).catch(() => {})
  }, [lang])
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
      setMsgs((m) => [...m, { role: 'assistant', content: r.answer, mode: r.mode, source: r.source, link: r.link }])
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', content: e.status === 0 ? t('common.offline') : e.message, mode: 'fallback' }])
    } finally {
      setBusy(false)
    }
  }

  if (blocked) return <div className="card">{t('dashboard.selectFarmer')}</div>

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col gap-3 md:h-[calc(100vh-7rem)]">
      <h1 className="text-2xl font-bold">💬 {t('nav.assistant')}</h1>
      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl bg-white p-3 ring-1 ring-gray-100">
        {intro && <div className="max-w-[85%] rounded-2xl bg-brand-50 p-3 text-sm">{intro.greeting}</div>}
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] space-y-1 rounded-2xl p-3 text-sm ${m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-gray-100'}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.role === 'assistant' && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {m.mode && <ModeBadge mode={m.mode} source={m.source} />}
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
      <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex gap-2">
        <input className="input" value={text} maxLength={500} onChange={(e) => setText(e.target.value)} placeholder={t('assistant.placeholder')} aria-label={t('assistant.placeholder')} />
        <button className="btn-primary" disabled={busy || !text.trim()}>{t('assistant.send')}</button>
      </form>
      <p className="text-[11px] text-gray-400">{t('assistant.disclaimer')}</p>
    </div>
  )
}
