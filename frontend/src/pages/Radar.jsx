import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api'
import { useFarmData } from '../hooks/useFarmData'
import FarmDataGate from '../components/FarmDataGate.jsx'
import ModeBadge from '../components/ModeBadge.jsx'
import RadarMap from '../components/RadarMap.jsx'
import OutbreakCard from '../components/OutbreakCard.jsx'
import RadarDemoPanel from '../components/RadarDemoPanel.jsx'
import { diseaseInfo } from '../components/DiseaseResult.jsx'

const RISK_CLS = { high: 'bg-red-100 text-red-800', medium: 'bg-orange-100 text-orange-800', low: 'bg-green-100 text-green-800' }

export default function Radar() {
  const { t, i18n } = useTranslation()
  const { farmerParam } = useAuth()
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  const map = useFarmData('/radar/map')
  const near = useFarmData('/radar/near-me')
  const risk = useFarmData('/radar/weather-risk')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const reloadAll = () => { map.reload(); near.reload(); risk.reload() }

  const analyze = async () => {
    setBusy(true)
    setMsg('')
    try {
      const s = await api('/radar/analyze', { method: 'POST', params: farmerParam })
      setMsg(t('radar.analyzed', { outbreaks: s.outbreaks, alerts: s.alerts_sent }))
      reloadAll()
    } catch (e) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  const m = map.data
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">📡 {t('nav.radar')}</h1>
        <button onClick={analyze} disabled={busy} className="btn-primary text-sm">{busy ? t('common.loading') : `🔄 ${t('radar.runNow')}`}</button>
      </div>
      <p className="text-sm text-gray-600">{t('radar.intro')}</p>
      {msg && <div className="card text-sm">{msg}</div>}

      <FarmDataGate state={map}>
        {m && (
          <>
            {m.has_demo && <div className="card border-l-4 border-purple-500 bg-purple-50 text-sm font-semibold text-purple-900">🧪 {t('radar.demoBanner')}</div>}
            <RadarMap data={m} />
            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
              <span>🔴 {t('radar.legendCase')}</span>
              <span className="text-yellow-600">◯ {t('radar.level.watch')}</span>
              <span className="text-orange-600">◯ {t('radar.level.warning')}</span>
              <span className="text-red-600">◯ {t('radar.level.outbreak')}</span>
              {m.last_run?.ran_at && <span>· {t('radar.lastRun')}: {new Date(m.last_run.ran_at).toLocaleTimeString()}</span>}
            </div>

            <h2 className="font-semibold">{t('radar.nearYou')}</h2>
            {near.data?.outbreaks?.length ? (
              near.data.outbreaks.map((o) => <OutbreakCard key={o.id} o={o} />)
            ) : (
              <div className="card text-sm text-green-700">✅ {t('radar.noneNear')}</div>
            )}
          </>
        )}
      </FarmDataGate>

      {risk.data && (
        <div className="card space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">🌦️ {t('radar.weatherOnly')}</h2>
            <ModeBadge mode={risk.data.mode} source={risk.data.source} />
          </div>
          <p className="text-xs text-gray-500">{t('radar.weatherOnlyHint')}</p>
          {!risk.data.supported ? (
            <p className="text-sm">{t('radar.cropNotSupported')}</p>
          ) : (
            <ul className="space-y-1">
              {risk.data.risks.map((r) => (
                <li key={r.disease} className="flex items-center justify-between text-sm">
                  <span>{diseaseInfo(r.disease, lang)?.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${RISK_CLS[r.risk]}`}>{t(`radar.risk.${r.risk}`)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {m && <RadarDemoPanel onChange={reloadAll} />}
      <p className="text-[11px] text-gray-400">{t('radar.privacy')}</p>
    </div>
  )
}
