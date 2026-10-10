import { useTranslation } from 'react-i18next'
import { useFarmData } from '../hooks/useFarmData'
import FarmDataGate from '../components/FarmDataGate.jsx'
import ModeBadge from '../components/ModeBadge.jsx'
import ShareButtons from '../components/ShareButtons.jsx'
import { renderMessage } from '../lib/messages'
import { formatDay, weatherIcon, weatherKey } from '../lib/weather'

export default function Weather() {
  const { t, i18n } = useTranslation()
  const state = useFarmData('/weather')
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  const env = state.data
  const wx = env?.data

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">🌦️ {t('nav.weather')}</h1>
        {env && <ModeBadge mode={env.mode} source={env.source} />}
      </div>
      <FarmDataGate state={state}>
        {env?.note && <div className="card border-l-4 border-orange-400 text-sm">{env.note}</div>}
        {!wx ? (
          <div className="card">{t('weather.noData')}</div>
        ) : (
          <>
            <div className="card flex flex-wrap items-center gap-4">
              <div className="text-6xl">{weatherIcon(wx.current.code)}</div>
              <div>
                <div className="text-4xl font-bold">{Math.round(wx.current.temp)}°C</div>
                <div className="text-gray-600">{t(`weather.code.${weatherKey(wx.current.code)}`)}</div>
              </div>
              <div className="ml-auto grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span>💧 {t('weather.humidity')}</span><b>{wx.current.humidity}%</b>
                <span>💨 {t('weather.wind')}</span><b>{Math.round(wx.current.wind)} km/h</b>
                <span>🌧️ {t('weather.rain24')}</span><b>{wx.rain_prob_24h}%</b>
                <span>🌱 {t('weather.soilMoisture')}</span><b>{wx.soil_moisture != null ? `${Math.round(wx.soil_moisture * 100)}%` : '–'}</b>
              </div>
            </div>

            {env.alerts?.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-semibold">⚠️ {t('weather.alerts')}</h2>
                {env.alerts.map((a) => {
                  const text = renderMessage(a.template_id, a.params, lang)
                  return (
                    <div key={a.key} className={`card space-y-2 border-l-4 ${a.severity === 'danger' ? 'border-red-500' : 'border-orange-400'}`}>
                      <p className="font-medium">{text}</p>
                      <ShareButtons text={text} />
                    </div>
                  )
                })}
              </div>
            )}

            <div>
              <h2 className="mb-2 font-semibold">{t('weather.next7')}</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {wx.days.map((d) => (
                  <div key={d.date} className="card p-3 text-center">
                    <div className="text-xs text-gray-500">{formatDay(d.date, lang)}</div>
                    <div className="my-1 text-3xl">{weatherIcon(d.code)}</div>
                    <div className="font-semibold">{Math.round(d.t_max)}° / {Math.round(d.t_min)}°</div>
                    <div className="text-xs text-blue-700">🌧️ {d.rain_prob}% · {d.rain_mm.toFixed(1)} mm</div>
                    <div className="text-xs text-gray-500">💨 {Math.round(d.wind_max)} km/h</div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400">{t('weather.updated')}: {new Date(wx.fetched_at).toLocaleString()}</p>
          </>
        )}
      </FarmDataGate>
    </div>
  )
}
