import { useTranslation } from 'react-i18next'
import ModeBadge from './ModeBadge.jsx'
import ShareButtons from './ShareButtons.jsx'
import { renderMessage } from '../lib/messages'
import { useMessageStrings } from '../lib/options'

const MEDAL = ['🏆', '🥈', '🥉']
const CONF = { high: 'bg-green-100 text-green-800', medium: 'bg-yellow-100 text-yellow-800', basic: 'bg-orange-100 text-orange-800' }
const MONTHS = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  hi: ['जन', 'फ़र', 'मार्च', 'अप्रै', 'मई', 'जून', 'जुला', 'अग', 'सित', 'अक्टू', 'नव', 'दिस'] }

export function sowingText(w, lang) {
  if (!w) return '—'
  const m = MONTHS[lang] || MONTHS.en
  return `${w[1]} ${m[w[0] - 1]} – ${w[3]} ${m[w[2] - 1]}`
}

const rupees = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`

function CropCard({ r, i, lang }) {
  const { t } = useTranslation()
  const strings = useMessageStrings()
  const name = strings.crops[r.crop] || r.crop
  const yieldText = `${r.yield_range[0]}–${r.yield_range[1]} ${t('crop.qPerAcre')}`
  const share = renderMessage('crop_plan', { crop: r.crop, match: r.score, yield: yieldText, window: sowingText(r.sowing_window, lang) }, lang)
  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xl font-bold">{MEDAL[i]} {name}</div>
        <div className="rounded-full bg-brand-50 px-3 py-1 text-sm font-bold text-brand-700">{t('crop.match', { pct: r.score })}</div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-gray-500">{t('crop.yield')}</span><b>{yieldText}</b>
        <span className="text-gray-500">{t('crop.profit')}</span><b className={r.profit_per_acre >= 0 ? 'text-green-700' : 'text-red-700'}>{rupees(r.profit_per_acre)} / {t('crop.acre')}</b>
        <span className="text-gray-500">{t('crop.sowing')}</span><b>{sowingText(r.sowing_window, lang)}</b>
        <span className="text-gray-500">{t('crop.water')}</span><b>{t(`crop.waterLevel.${r.water_need}`)} · {r.duration_days} {t('crop.days')}</b>
      </div>
      <ul className="space-y-0.5 text-sm">
        {r.reasons.map((c) => <li key={c}>✅ {t(`crop.reason.${c}`)}</li>)}
        {r.warnings.map((c) => <li key={c}>⚠️ {t(`crop.reason.${c}`)}</li>)}
      </ul>
      <p className="text-[11px] text-gray-400">{t('crop.priceNote', { price: rupees(r.price_per_q), basis: r.price_basis, cost: rupees(r.cost_per_acre) })}</p>
      {i === 0 && <ShareButtons text={share} />}
    </div>
  )
}

export default function CropResults({ data }) {
  const { t, i18n } = useTranslation()
  const strings = useMessageStrings()
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  if (!data.top.length) return <div className="card">{t('crop.noneSuitable')}</div>
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${CONF[data.confidence]}`}>{t(`crop.confidence.${data.confidence}`)}</span>
        <ModeBadge mode={data.sources.soil.mode} source={data.sources.soil.source} />
        <ModeBadge mode={data.sources.climate.mode} source={data.sources.climate.source} />
      </div>
      <p className="text-xs text-gray-500">
        {t('crop.inputsUsed', { season: t(`crop.season.${data.season}`), t: data.inputs.climate.temperature, rain: data.inputs.climate.rainfall, ph: data.inputs.ph, soil: t(`soil.${data.inputs.soil_type}`) })}
      </p>
      {data.top.map((r, i) => <CropCard key={r.crop} r={r} i={i} lang={lang} />)}

      {data.rotation_plan.length > 0 && (
        <div className="card">
          <h3 className="mb-2 font-semibold">🔄 {t('crop.rotation')}</h3>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {data.rotation_plan.map((p, i) => (
              <span key={p.season} className="flex items-center gap-2">
                {i > 0 && <span className="text-gray-400">→</span>}
                <span className="rounded-xl bg-brand-50 px-3 py-1"><b>{strings.crops[p.crop] || '—'}</b> <span className="text-xs text-gray-500">({t(`crop.season.${p.season}`)})</span></span>
              </span>
            ))}
          </div>
        </div>
      )}

      {data.fertilizer_tips.length > 0 && (
        <div className="card">
          <h3 className="mb-2 font-semibold">🧪 {t('crop.soilTips')}</h3>
          <ul className="space-y-1 text-sm">{data.fertilizer_tips.map((tp) => <li key={tp.code}>• {t(`crop.tip.${tp.code}`, { v: tp.value })}</li>)}</ul>
          <p className="mt-1 text-[11px] text-gray-400">{t('crop.tipNote')}</p>
        </div>
      )}

      {data.not_recommended.length > 0 && (
        <div className="card">
          <h3 className="mb-2 font-semibold">❌ {t('crop.notRecommended')}</h3>
          <ul className="space-y-1 text-sm">
            {data.not_recommended.map((n) => (
              <li key={n.crop}><b>{strings.crops[n.crop] || n.crop}</b>: {n.blockers.map((b) => t(`crop.reason.${b}`)).join(', ')}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[11px] text-gray-400">{t('crop.disclaimer')}</p>
    </div>
  )
}
