import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useFarmData } from '../hooks/useFarmData'
import { diseaseInfo } from './DiseaseResult.jsx'

// Dashboard: show the most important nearby warning/outbreak (if any).
export default function RadarBanner() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  const { data } = useFarmData('/radar/near-me')
  const top = data?.outbreaks?.find((o) => o.level !== 'watch')
  if (!top) return null
  const red = top.level === 'outbreak'
  return (
    <Link to="/radar" className={`card block border-l-4 ${red ? 'border-red-600 bg-red-50' : 'border-orange-500 bg-orange-50'}`}>
      <div className="font-bold">{red ? '🔴' : '🟠'} {t('radar.banner')}</div>
      <div className="text-sm">
        {diseaseInfo(top.disease, lang)?.name} · {t('radar.bannerText', { farms: top.farm_count, dist: top.distance_km })}
        {top.is_demo && <span className="ml-2 rounded-full bg-purple-100 px-2 text-xs font-bold text-purple-800">🧪 {t('radar.demoData')}</span>}
      </div>
    </Link>
  )
}
