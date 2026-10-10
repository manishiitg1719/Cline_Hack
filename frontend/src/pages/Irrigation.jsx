import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useFarmData } from '../hooks/useFarmData'
import FarmDataGate from '../components/FarmDataGate.jsx'
import ModeBadge from '../components/ModeBadge.jsx'
import ShareButtons from '../components/ShareButtons.jsx'
import { renderMessage } from '../lib/messages'
import { useMessageStrings } from '../lib/options'
import { DECISION_STYLE } from '../lib/weather'

function Stat({ label, value, unit }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-bold">{value ?? '–'}<span className="text-sm font-normal"> {value != null ? unit : ''}</span></div>
    </div>
  )
}

export default function Irrigation() {
  const { t, i18n } = useTranslation()
  const strings = useMessageStrings()
  const state = useFarmData('/irrigation')
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  const env = state.data
  const r = env?.data
  const style = r ? DECISION_STYLE[r.decision] : null
  const shareText = env?.alert ? renderMessage(env.alert.template_id, env.alert.params, lang) : ''

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">💧 {t('nav.irrigation')}</h1>
        {env && <ModeBadge mode={env.mode} source={env.source} />}
      </div>
      <FarmDataGate state={state}>
        {env?.note && <div className="card border-l-4 border-orange-400 text-sm">{env.note}</div>}
        {!r ? (
          <div className="card">{t('weather.noData')}</div>
        ) : (
          <>
            <div className={`rounded-2xl p-6 text-center shadow ${style.cls}`}>
              <div className="text-5xl">{style.icon}</div>
              <div className="mt-2 text-3xl font-extrabold">{t(`irrigation.decision.${r.decision}`)}</div>
              {r.crop && <div className="mt-1 opacity-90">{strings.crops[r.crop] || r.crop}</div>}
            </div>

            <div className="card">
              <h2 className="mb-2 font-semibold">{t('irrigation.why')}</h2>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {r.reasons.map((code) => (
                  <li key={code}>{t(`irrigation.reason.${code}`, { rain: r.rain_prob_24h, available: r.available_water_pct, et: r.crop_need_today_mm })}</li>
                ))}
              </ul>
              {!r.crop && <p className="mt-2 text-xs text-gray-500">{t('irrigation.setCrop')} <Link to="/farm" className="underline">{t('nav.farm')}</Link></p>}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label={t('irrigation.availableWater')} value={r.available_water_pct} unit="%" />
              <Stat label={t('irrigation.needToday')} value={r.crop_need_today_mm} unit="mm" />
              <Stat label={t('irrigation.needWeek')} value={r.net_irrigation_week_mm} unit="mm" />
              <Stat label={t('weather.rain24')} value={r.rain_prob_24h} unit="%" />
            </div>
            {r.litres_today != null && (
              <div className="card text-sm">
                🚰 {t('irrigation.litres', { today: r.litres_today.toLocaleString(), week: r.litres_week.toLocaleString() })}
              </div>
            )}
            <p className="text-xs text-gray-500">{t('irrigation.method', { kc: r.kc })}</p>

            {shareText && (
              <div className="card space-y-2">
                <div className="text-sm font-semibold">📤 {t('irrigation.share')}</div>
                <p className="rounded-xl bg-green-50 p-2 text-sm">{shareText}</p>
                <ShareButtons text={shareText} />
              </div>
            )}
          </>
        )}
      </FarmDataGate>
    </div>
  )
}
