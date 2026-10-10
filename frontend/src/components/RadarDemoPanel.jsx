import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api'

const DEMO_DISEASES = ['Potato___Late_blight', 'Tomato___Late_blight', 'Tomato___Early_blight', 'Corn_(maize)___Common_rust_']

// For judges / testing: add clearly-labelled fake nearby cases, then run the analysis.
export default function RadarDemoPanel({ onChange }) {
  const { t } = useTranslation()
  const { farmerParam } = useAuth()
  const [disease, setDisease] = useState(DEMO_DISEASES[0])
  const [farms, setFarms] = useState(6)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const run = async (fn) => {
    setBusy(true)
    setMsg('')
    try {
      setMsg(await fn())
      onChange()
    } catch (e) {
      setMsg(e.message)
    } finally {
      setBusy(false)
    }
  }

  const seed = () => run(async () => {
    await api('/radar/demo/seed', { method: 'POST', body: { disease, farms: Number(farms), spread_km: 3 }, params: farmerParam })
    const s = await api('/radar/analyze', { method: 'POST', params: farmerParam })
    return t('radar.analyzed', { outbreaks: s.outbreaks, alerts: s.alerts_sent })
  })
  const clear = () => run(async () => {
    const r = await api('/radar/demo', { method: 'DELETE' })
    await api('/radar/analyze', { method: 'POST', params: farmerParam })
    return t('radar.demoCleared', { count: r.removed_scans })
  })

  return (
    <details className="card">
      <summary className="cursor-pointer font-medium">🧪 {t('radar.demoTitle')}</summary>
      <p className="mt-2 text-xs text-gray-500">{t('radar.demoHint')}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <select className="input sm:col-span-2" value={disease} onChange={(e) => setDisease(e.target.value)} aria-label="disease">
          {DEMO_DISEASES.map((d) => <option key={d} value={d}>{d.replace(/___/g, ' – ').replace(/_/g, ' ')}</option>)}
        </select>
        <input className="input" type="number" min="2" max="30" value={farms} onChange={(e) => setFarms(e.target.value)} aria-label="farms" />
        <button className="btn-primary" disabled={busy} onClick={seed}>{t('radar.demoAdd')}</button>
      </div>
      <button className="btn-outline mt-2 w-full text-sm" disabled={busy} onClick={clear}>{t('radar.demoClear')}</button>
      {msg && <p className="mt-2 text-sm">{msg}</p>}
    </details>
  )
}
