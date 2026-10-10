import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import ModeBadge from '../components/ModeBadge.jsx'

export default function SystemStatus() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = () =>
    api('/status')
      .then(setData)
      .catch((e) => setError(e.message))

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🔀 {t('status.title')}</h1>
      <p className="text-sm text-gray-600">{t('status.intro')}</p>
      {error && <div className="card border-l-4 border-red-400 text-red-700">{error}</div>}
      {data?.force_fallback && <div className="card border-l-4 border-orange-400">{t('status.forced')}</div>}
      {data && (
        <>
          <div className="flex gap-3">
            <div className="card flex-1 text-center">
              <div className="text-3xl font-bold text-green-700">{data.summary.live}</div>
              <div className="text-sm">{t('status.live')}</div>
            </div>
            <div className="card flex-1 text-center">
              <div className="text-3xl font-bold text-orange-600">{data.summary.fallback}</div>
              <div className="text-sm">{t('status.fallback')}</div>
            </div>
          </div>
          <div className="space-y-2">
            {data.providers.map((p) => (
              <div key={p.name} className="card flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">{p.label}</div>
                  {p.reason && <div className="text-xs text-gray-500">{t('status.reason')}: {p.reason}</div>}
                </div>
                <ModeBadge mode={p.mode} source={p.source} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
