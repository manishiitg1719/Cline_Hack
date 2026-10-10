import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api'
import ChipGroup from '../components/ChipGroup.jsx'
import SeasonSoilStep from '../components/SeasonSoilStep.jsx'
import SoilCardStep from '../components/SoilCardStep.jsx'
import CropResults from '../components/CropResults.jsx'
import FarmDataGate from '../components/FarmDataGate.jsx'
import { useFarmData } from '../hooks/useFarmData'
import { CROP_KEYS, WATERS, useMessageStrings } from '../lib/options'

const BUDGETS = ['low', 'medium', 'high']
const GOALS = ['profit', 'low_risk', 'low_water', 'improve_soil']

function currentSeason() {
  const m = new Date().getMonth() + 1
  return m >= 6 && m <= 10 ? 'kharif' : m >= 11 || m <= 2 ? 'rabi' : 'zaid'
}

export default function CropAdvisor() {
  const { t } = useTranslation()
  const { farmerParam } = useAuth()
  const strings = useMessageStrings()
  const farm = useFarmData('/farm')
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ season: currentSeason(), soil_type: '', last_crop: '', water_source: '', budget: 'medium', goal: 'profit' })
  const [card, setCard] = useState({})
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    const f = farm.data
    if (!f) return
    setForm((s) => ({ ...s, soil_type: f.soil_type || '', water_source: f.water_source || '', last_crop: f.past_crops?.[0] || f.current_crop || '' }))
  }, [farm.data])

  const submit = async () => {
    setBusy(true)
    setError('')
    const cardValues = Object.fromEntries(Object.entries(card).filter(([, v]) => v !== '' && v != null).map(([k, v]) => [k, Number(v)]))
    try {
      setResult(await api('/crop/advice', { method: 'POST', params: farmerParam,
        body: { ...form, card: Object.keys(cardValues).length ? cardValues : null } }))
      setStep(4)
    } catch (e) {
      setError(e.status === 409 ? t('weather.needLocation') : e.message)
    } finally {
      setBusy(false)
    }
  }

  const nav = (back, next, nextLabel = t('crop.next')) => (
    <div className="flex gap-2">
      {back && <button className="btn-outline" onClick={() => setStep(back)}>{t('common.back')}</button>}
      <button className="btn-primary flex-1" disabled={busy} onClick={next}>{nextLabel}</button>
    </div>
  )

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🌱 {t('nav.crop')}</h1>
      <FarmDataGate state={farm}>
        {farm.data?.latitude == null ? (
          <FarmDataGate state={{ errorStatus: 409 }} />
        ) : (
          <>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((n) => <div key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? 'bg-brand-600' : 'bg-gray-200'}`} />)}
            </div>
            {step === 1 && (
              <div className="card space-y-3">
                <h2 className="font-semibold">1. {t('crop.step1')}</h2>
                <SeasonSoilStep form={form} set={set} />
                {nav(null, () => setStep(2))}
              </div>
            )}
            {step === 2 && (
              <div className="card space-y-3">
                <h2 className="font-semibold">2. {t('crop.step2')} <span className="text-sm font-normal text-gray-500">({t('common.optional')})</span></h2>
                <SoilCardStep values={card} onChange={setCard} />
                {nav(1, () => setStep(3))}
              </div>
            )}
            {step === 3 && (
              <div className="card space-y-3">
                <h2 className="font-semibold">3. {t('crop.step3')}</h2>
                <label className="label" htmlFor="last">{t('crop.lastCrop')}</label>
                <select id="last" className="input" value={form.last_crop} onChange={(e) => set('last_crop')(e.target.value)}>
                  <option value="">—</option>
                  {CROP_KEYS.map((c) => <option key={c} value={c}>{strings.crops[c]}</option>)}
                </select>
                <span className="label">{t('farm.water')}</span>
                <ChipGroup options={WATERS} value={form.water_source} onChange={set('water_source')} labelOf={(w) => t(`water.${w}`)} />
                <span className="label">{t('crop.budgetLabel')}</span>
                <ChipGroup options={BUDGETS} value={form.budget} onChange={set('budget')} labelOf={(b) => t(`crop.budget.${b}`)} />
                <span className="label">{t('crop.goalLabel')}</span>
                <ChipGroup options={GOALS} value={form.goal} onChange={set('goal')} labelOf={(g) => t(`crop.goal.${g}`)} />
                {error && <p className="text-sm text-red-600">{error}</p>}
                {nav(2, submit, busy ? t('common.loading') : `🏆 ${t('crop.getAdvice')}`)}
              </div>
            )}
            {step === 4 && result && (
              <>
                <CropResults data={result} />
                <button className="btn-outline w-full" onClick={() => setStep(1)}>{t('crop.again')}</button>
              </>
            )}
          </>
        )}
      </FarmDataGate>
    </div>
  )
}
