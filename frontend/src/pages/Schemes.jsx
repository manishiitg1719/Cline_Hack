import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import ShareButtons from '../components/ShareButtons.jsx'

export default function Schemes() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)

  useEffect(() => {
    api('/schemes', { params: { language: lang } }).then(setData).catch((e) => setError(e.message))
  }, [lang, t])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🏛️ {t('nav.schemes')}</h1>
      <p className="text-sm text-gray-600">{t('schemes.intro')}</p>
      {error && <div className="card text-red-700">{error}</div>}
      {data?.schemes.map((s) => (
        <div key={s.id} className="card space-y-2">
          <button className="flex w-full items-center justify-between text-left" onClick={() => setOpen(open === s.id ? null : s.id)}>
            <span className="text-lg font-semibold">{s.icon} {s.name}</span>
            <span className="text-gray-400">{open === s.id ? '▲' : '▼'}</span>
          </button>
          <p className="text-sm">{s.benefit}</p>
          {open === s.id && (
            <div className="space-y-2 text-sm">
              <p><b>{t('schemes.who')}:</b> {s.who}</p>
              <p><b>{t('schemes.how')}:</b> {s.how}</p>
              <a href={s.url} target="_blank" rel="noreferrer" className="btn-outline inline-flex text-sm">🔗 {t('schemes.official')}</a>
              <ShareButtons text={`${s.icon} ${s.name}: ${s.benefit} ${s.url}`} />
            </div>
          )}
        </div>
      ))}
      {data && <p className="text-[11px] text-gray-400">{t('schemes.note', { date: data.last_checked })}</p>}
    </div>
  )
}
