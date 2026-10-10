import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api'
import LocationPicker from '../components/LocationPicker.jsx'
import ChipGroup from '../components/ChipGroup.jsx'
import { CROP_KEYS, SOILS, WATERS, useMessageStrings } from '../lib/options'

const EMPTY = {
  village: '', district: '', state: '', latitude: null, longitude: null, area_acres: '',
  soil_type: '', water_source: '', current_crop: '', past_crops: [],
}
const EDITABLE = Object.keys(EMPTY)

export default function FarmProfile() {
  const { t } = useTranslation()
  const { user, actingFor, farmerParam } = useAuth()
  const strings = useMessageStrings()
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState('loading') // loading | idle | saving | saved | error
  const [error, setError] = useState('')
  const isHelper = user.role === 'helper'
  const readOnly = isHelper && !actingFor?.can_edit

  useEffect(() => {
    if (isHelper && !actingFor) return setStatus('idle')
    api('/farm', { params: farmerParam })
      .then((f) => {
        setForm({ ...EMPTY, ...f, area_acres: f.area_acres ?? '' })
        setStatus('idle')
      })
      .catch((e) => {
        setError(e.message)
        setStatus('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingFor?.user_id])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const setVal = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const useGps = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setForm((f) => ({ ...f, latitude: +p.coords.latitude.toFixed(6), longitude: +p.coords.longitude.toFixed(6) })),
      (err) => setError(err.message),
    )

  const save = async (e) => {
    e.preventDefault()
    setStatus('saving')
    setError('')
    try {
      const body = Object.fromEntries(EDITABLE.map((k) => [k, form[k]]))
      body.area_acres = form.area_acres === '' ? null : Number(form.area_acres)
      await api('/farm', { method: 'PUT', body, params: farmerParam })
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  if (status === 'loading') return <p>{t('common.loading')}</p>
  if (isHelper && !actingFor) return <div className="card">{t('dashboard.selectFarmer')}</div>

  return (
    <form onSubmit={save} className="space-y-4">
      <h1 className="text-2xl font-bold">🌾 {t('farm.title')}</h1>
      {readOnly && <div className="card border-l-4 border-orange-400 text-sm">{t('farm.viewOnly')}</div>}

      <fieldset disabled={readOnly} className="space-y-4">
        <div className="card space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-semibold">{t('farm.location')}</div>
              <div className="text-xs text-gray-500">{t('farm.locationHint')}</div>
            </div>
            <button type="button" onClick={useGps} className="btn-outline text-sm">{t('farm.useGps')}</button>
          </div>
          <LocationPicker
            lat={form.latitude}
            lon={form.longitude}
            disabled={readOnly}
            onPick={(latitude, longitude) => setForm((f) => ({ ...f, latitude, longitude }))}
          />
          {form.latitude != null && <div className="text-xs text-gray-500">{form.latitude}, {form.longitude}</div>}
          <div className="grid gap-3 sm:grid-cols-3">
            {['village', 'district', 'state'].map((k) => (
              <div key={k}>
                <label className="label" htmlFor={k}>{t(`farm.${k}`)}</label>
                <input id={k} className="input" value={form[k]} onChange={set(k)} />
              </div>
            ))}
          </div>
        </div>

        <div className="card grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="area">{t('farm.area')}</label>
            <input id="area" type="number" min="0" step="0.1" className="input" value={form.area_acres} onChange={set('area_acres')} />
          </div>
          <div>
            <label className="label" htmlFor="soil">{t('farm.soil')}</label>
            <select id="soil" className="input" value={form.soil_type} onChange={set('soil_type')}>
              {SOILS.map((s) => <option key={s} value={s}>{t(`soil.${s}`)}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="crop">{t('farm.currentCrop')}</label>
            <select id="crop" className="input" value={form.current_crop} onChange={set('current_crop')}>
              <option value="">—</option>
              {CROP_KEYS.map((c) => <option key={c} value={c}>{strings.crops[c]}</option>)}
            </select>
          </div>
          <div>
            <span className="label">{t('farm.water')}</span>
            <ChipGroup options={WATERS} value={form.water_source} onChange={setVal('water_source')} labelOf={(w) => t(`water.${w}`)} />
          </div>
        </div>

        <div className="card">
          <span className="label">{t('farm.pastCrops')}</span>
          <ChipGroup multi rounded="rounded-full" options={CROP_KEYS} value={form.past_crops} onChange={setVal('past_crops')} labelOf={(c) => strings.crops[c]} />
        </div>
      </fieldset>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!readOnly && (
        <button className="btn-primary w-full sm:w-auto" disabled={status === 'saving'}>
          {status === 'saving' ? t('common.loading') : status === 'saved' ? t('common.saved') : t('common.save')}
        </button>
      )}
    </form>
  )
}
