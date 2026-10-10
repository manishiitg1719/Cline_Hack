import { useTranslation } from 'react-i18next'
import kbEn from '@shared/disease/kb_en.json'
import kbHi from '@shared/disease/kb_hi.json'
import { diseaseInfo } from './DiseaseResult.jsx'
import ShareButtons from './ShareButtons.jsx'
import { renderMessage } from '../lib/messages'
import { useMessageStrings } from '../lib/options'

const KB = { en: kbEn, hi: kbHi }

const STYLE = {
  watch: 'border-yellow-400 bg-yellow-50',
  warning: 'border-orange-500 bg-orange-50',
  outbreak: 'border-red-600 bg-red-50',
}
const ICON = { watch: '🟡', warning: '🟠', outbreak: '🔴' }

export default function OutbreakCard({ o, share = true }) {
  const { t, i18n } = useTranslation()
  const strings = useMessageStrings()
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  const info = diseaseInfo(o.disease, lang)
  const text = renderMessage('radar_outbreak', {
    disease: o.disease, farms: o.farm_count, radius: Math.ceil(o.distance_km + o.radius_km),
    risk: o.weather_risk === 'unknown' ? 'medium' : o.weather_risk, crop: o.crop,
  }, lang)

  return (
    <div className={`card space-y-2 border-l-4 ${STYLE[o.level]}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-bold">{ICON[o.level]} {t(`radar.level.${o.level}`)}: {info?.name}</div>
        {o.is_demo && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">🧪 {t('radar.demoData')}</span>}
      </div>
      <div className="text-sm text-gray-700">
        {t('radar.summary', { farms: o.farm_count, dist: o.distance_km, crop: strings.crops[o.crop] || KB[lang].crop_names[o.crop] || o.crop })}
        {' · '}{t('radar.weatherRisk')}: <b>{t(`radar.risk.${o.weather_risk}`)}</b>
      </div>
      {o.my_crop && <div className="text-sm font-semibold text-red-700">⚠️ {t('radar.yourCrop')}</div>}
      {info?.prevention && <p className="text-sm">🛡️ {info.prevention}</p>}
      {share && <ShareButtons text={text} />}
    </div>
  )
}
