import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import kbEn from '@shared/disease/kb_en.json'
import kbHi from '@shared/disease/kb_hi.json'
import ShareButtons from './ShareButtons.jsx'
import { renderMessage } from '../lib/messages'
import { parseLabel } from '../lib/diseaseMath'

const KB = { en: kbEn, hi: kbHi }

export function diseaseInfo(label, lang) {
  const kb = KB[lang] || KB.en
  return label.endsWith('healthy') ? kb.healthy : kb.classes[label]
}

export default function DiseaseResult({ result }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  const kb = KB[lang]
  const pct = Math.round(result.confidence * 100)
  const cropName = kb.crop_names[result.crop] || result.crop

  if (result.status === 'rejected')
    return (
      <div className="card border-l-4 border-red-500">
        <p className="font-semibold">🚫 {t('scan.rejected')}</p>
        <p className="mt-1 text-sm text-gray-600">{t('scan.photoTips')}</p>
      </div>
    )
  if (result.status === 'unsure')
    return (
      <div className="card border-l-4 border-orange-400">
        <p className="font-semibold">⚠️ {t('scan.unsure', { pct })}</p>
        <p className="mt-1 text-sm text-gray-600">{t('scan.photoTips')}</p>
        <p className="mt-2 text-xs text-gray-500">{t('scan.bestGuess')}: {cropName} – {diseaseInfo(result.label, lang)?.name}</p>
      </div>
    )

  const info = diseaseInfo(result.label, lang)
  const healthy = result.status === 'healthy'
  const shareText = healthy
    ? `✅ ${cropName}: ${info.name} (${pct}%)`
    : renderMessage('disease_result', { crop: cropName, disease: info.name, confidence: pct, treatment: info.treatment }, lang)

  return (
    <div className="space-y-3">
      <div className={`card border-l-4 ${healthy ? 'border-green-500' : 'border-red-500'}`}>
        <div className="text-sm text-gray-500">{cropName}</div>
        <div className="text-2xl font-bold">{healthy ? '✅' : '🦠'} {info.name}</div>
        <div className="mt-2 h-2 rounded-full bg-gray-100">
          <div className={`h-2 rounded-full ${healthy ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-sm text-gray-600">{t('scan.confidence')}: {pct}%</div>
      </div>

      {!healthy && (
        <Link to="/radar" className="block rounded-xl bg-blue-50 p-2 text-xs text-blue-900">📡 {t('radar.sharedNote')} →</Link>
      )}

      {!healthy && (
        <div className="card space-y-2 text-sm">
          {['symptoms', 'cause', 'treatment', 'prevention'].map((f) => (
            <div key={f}>
              <div className="font-semibold">{t(`scan.field.${f}`)}</div>
              <p className="text-gray-700">{info[f]}</p>
            </div>
          ))}
          <p className="rounded-lg bg-yellow-50 p-2 text-xs text-yellow-800">⚠️ {kb._note}</p>
        </div>
      )}
      {healthy && <div className="card text-sm">{info.prevention}</div>}

      {result.top.length > 1 && (
        <details className="card text-sm">
          <summary className="cursor-pointer font-medium">{t('scan.otherPossibilities')}</summary>
          <ul className="mt-2 space-y-1">
            {result.top.slice(1).map((o) => (
              <li key={o.label} className="flex justify-between">
                <span>{diseaseInfo(o.label, lang)?.name} ({kb.crop_names[parseLabel(o.label).crop]})</span>
                <span className="text-gray-500">{Math.round(o.prob * 100)}%</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="card space-y-2">
        <div className="text-sm font-semibold">📤 {t('scan.share')}</div>
        <p className="rounded-xl bg-green-50 p-2 text-sm">{shareText}</p>
        <ShareButtons text={shareText} />
      </div>
    </div>
  )
}
