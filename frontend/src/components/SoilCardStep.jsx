import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiUpload } from '../api'
import ModeBadge from './ModeBadge.jsx'

const FIELDS = [
  { key: 'ph', step: '0.1', unit: '' },
  { key: 'n', step: '1', unit: 'kg/ha' },
  { key: 'p', step: '0.1', unit: 'kg/ha' },
  { key: 'k', step: '1', unit: 'kg/ha' },
  { key: 'oc', step: '0.01', unit: '%' },
]

// Soil Health Card: AI reads the photo (LIVE) or the farmer types the numbers (FALLBACK).
export default function SoilCardStep({ values, onChange }) {
  const { t } = useTranslation()
  const fileRef = useRef(null)
  const [reading, setReading] = useState(false)
  const [result, setResult] = useState(null)

  const onPhoto = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setReading(true)
    try {
      const fd = new FormData()
      fd.append('image', f)
      const r = await apiUpload('/crop/read-card', fd)
      setResult(r)
      if (r.values) onChange(Object.fromEntries(Object.entries(r.values).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])))
    } catch (err) {
      setResult({ mode: 'fallback', note: err.message })
    } finally {
      setReading(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">{t('crop.cardHint')}</p>
      <button type="button" className="btn-outline w-full" disabled={reading} onClick={() => fileRef.current?.click()}>
        📷 {reading ? t('common.loading') : t('crop.cardPhoto')}
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
      {result && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <ModeBadge mode={result.mode} source={result.source} />
          <span className="text-gray-600">{result.note}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="label" htmlFor={`card-${f.key}`}>{t(`crop.card.${f.key}`)} {f.unit && <span className="text-xs text-gray-400">{f.unit}</span>}</label>
            <input id={`card-${f.key}`} type="number" min="0" step={f.step} className="input" value={values[f.key] ?? ''}
              onChange={(e) => onChange({ ...values, [f.key]: e.target.value })} />
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500">{t('crop.cardSkip')}</p>
    </div>
  )
}
