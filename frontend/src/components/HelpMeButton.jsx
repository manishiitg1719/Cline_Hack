import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { useMessageStrings } from '../lib/options'
import { smsLink } from '../lib/messages'

// Big "Help me" button for farmers: notifies all helpers and gives a ready WhatsApp message per helper.
export default function HelpMeButton() {
  const { t } = useTranslation()
  const strings = useMessageStrings()
  const [open, setOpen] = useState(false)
  const [issue, setIssue] = useState('app')
  const [note, setNote] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const send = async () => {
    setError('')
    try {
      setResult(await api('/family/help', { method: 'POST', body: { issue, note } }))
    } catch (e) {
      setError(e.message)
    }
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn w-full bg-orange-500 py-4 text-lg text-white hover:bg-orange-600">
        🙋 {t('family.helpMe')}
      </button>
    )

  return (
    <div className="card space-y-3 border-2 border-orange-300">
      <h2 className="text-lg font-bold">🙋 {t('family.helpMe')}</h2>
      {!result ? (
        <>
          <div className="flex flex-wrap gap-2">
            {Object.keys(strings.issues).map((k) => (
              <button key={k} type="button" onClick={() => setIssue(k)}
                className={`rounded-xl border px-3 py-2 text-sm ${issue === k ? 'border-orange-500 bg-orange-50 font-semibold' : 'border-gray-300'}`}>
                {strings.issues[k]}
              </button>
            ))}
          </div>
          <textarea className="input" rows={2} maxLength={300} placeholder={t('msg.typeHere')} value={note} onChange={(e) => setNote(e.target.value)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={send} className="btn flex-1 bg-orange-500 text-white">{t('family.sendHelp')}</button>
            <button onClick={() => setOpen(false)} className="btn-outline">{t('common.cancel')}</button>
          </div>
        </>
      ) : result.notified === 0 ? (
        <p className="text-sm">{t('family.noHelpers')}</p>
      ) : (
        <>
          <p className="text-sm text-green-700">✓ {t('family.helpSent', { count: result.notified })}</p>
          {result.helpers.map((h) => (
            <div key={h.helper_id} className="rounded-xl bg-gray-50 p-3">
              <div className="mb-2 text-sm"><b>{h.name}</b>: {h.text}</div>
              <div className="flex gap-2">
                <a href={h.whatsapp} target="_blank" rel="noreferrer" className="btn flex-1 bg-[#25D366] text-white">🟢 {t('msg.whatsapp')}</a>
                <a href={h.sms || smsLink(h.text)} className="btn flex-1 bg-blue-600 text-white">✉️ {t('msg.sms')}</a>
              </div>
            </div>
          ))}
          <button onClick={() => { setResult(null); setOpen(false); setNote('') }} className="btn-outline w-full">{t('common.back')}</button>
        </>
      )}
    </div>
  )
}
