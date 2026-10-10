import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useFarmData } from '../hooks/useFarmData'
import ModeBadge from './ModeBadge.jsx'
import { DECISION_STYLE, weatherIcon, weatherKey } from '../lib/weather'

// Dashboard: today's weather + irrigation decision at a glance.
export default function TodayCards() {
  const { t } = useTranslation()
  const weather = useFarmData('/weather')
  const irrigation = useFarmData('/irrigation')
  if (weather.blocked || weather.errorStatus === 409) return null

  const wx = weather.data?.data
  const ir = irrigation.data?.data
  const style = ir ? DECISION_STYLE[ir.decision] : null

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Link to="/weather" className="card block hover:ring-brand-500">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm text-gray-500">🌦️ {t('weather.today')}</span>
          {weather.data && <ModeBadge mode={weather.data.mode} />}
        </div>
        {wx ? (
          <div className="flex items-center gap-3">
            <span className="text-4xl">{weatherIcon(wx.current.code)}</span>
            <div>
              <div className="text-2xl font-bold">{Math.round(wx.current.temp)}°C</div>
              <div className="text-sm text-gray-600">{t(`weather.code.${weatherKey(wx.current.code)}`)} · 🌧️ {wx.rain_prob_24h}%</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">{weather.loading ? t('common.loading') : t('weather.noData')}</div>
        )}
      </Link>
      <Link to="/irrigation" className="card block hover:ring-brand-500">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-sm text-gray-500">💧 {t('nav.irrigation')}</span>
          {irrigation.data && <ModeBadge mode={irrigation.data.mode} />}
        </div>
        {ir ? (
          <span className={`inline-block rounded-xl px-3 py-2 text-lg font-bold ${style.cls}`}>
            {style.icon} {t(`irrigation.decision.${ir.decision}`)}
          </span>
        ) : (
          <div className="text-sm text-gray-500">{irrigation.loading ? t('common.loading') : t('weather.noData')}</div>
        )}
      </Link>
    </div>
  )
}
