import { useTranslation } from 'react-i18next'
import { diseaseInfo } from './DiseaseResult.jsx'

const EXAMPLES = ['tomato_late_blight', 'potato_early_blight', 'apple_apple_scab', 'corn_common_rust', 'grape_black_rot', 'pepper_bell_healthy']

export function ExamplePhotos({ disabled, onPick }) {
  const { t } = useTranslation()
  return (
    <details className="card">
      <summary className="cursor-pointer font-medium">🧪 {t('scan.tryExamples')}</summary>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {EXAMPLES.map((e) => (
          <button key={e} disabled={disabled} onClick={() => onPick(`/models/disease/examples/${e}.jpg`)}
            className="overflow-hidden rounded-xl ring-1 ring-gray-200 disabled:opacity-50">
            <img src={`/models/disease/examples/${e}.jpg`} alt={e.replace(/_/g, ' ')} className="aspect-square w-full object-cover" />
          </button>
        ))}
      </div>
    </details>
  )
}

export function ScanHistory({ history }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  if (!history.length) return null
  return (
    <div className="card">
      <h2 className="mb-2 font-semibold">🕘 {t('scan.history')}</h2>
      <ul className="divide-y text-sm">
        {history.slice(0, 10).map((h) => (
          <li key={h.client_id} className="flex justify-between gap-2 py-2">
            <span>{h.status === 'healthy' ? '✅' : h.status === 'unsure' ? '⚠️' : '🦠'} {diseaseInfo(h.disease, lang)?.name}</span>
            <span className="shrink-0 text-xs text-gray-500">{Math.round(h.confidence * 100)}% · {new Date(h.scanned_at).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
