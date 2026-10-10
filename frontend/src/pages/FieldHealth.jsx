import { Circle, MapContainer, TileLayer } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import { useFarmData } from '../hooks/useFarmData'
import FarmDataGate from '../components/FarmDataGate.jsx'
import ModeBadge from '../components/ModeBadge.jsx'
import NdviChart from '../components/NdviChart.jsx'
import ShareButtons from '../components/ShareButtons.jsx'

const STATUS = {
  healthy: { icon: '🟢', cls: 'bg-green-600' },
  moderate: { icon: '🟡', cls: 'bg-lime-600' },
  stressed: { icon: '🟠', cls: 'bg-amber-500' },
  bare: { icon: '🟤', cls: 'bg-stone-500' },
}

function ScoreRing({ score, cls }) {
  return (
    <div className={`flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-full text-white shadow ${cls}`}>
      <div className="text-4xl font-extrabold">{score}</div>
      <div className="text-xs opacity-90">/ 100</div>
    </div>
  )
}

export default function FieldHealth() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  const state = useFarmData('/satellite')
  const env = state.data
  const d = env?.data

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">🛰️ {t('nav.satellite')}</h1>
        {env && <ModeBadge mode={env.mode} source={env.source} />}
      </div>
      <p className="text-sm text-gray-600">{t('sat.intro')}</p>
      <FarmDataGate state={state}>
        {env?.note && <div className={`card text-sm ${env.mode === 'live' ? 'text-gray-500' : 'border-l-4 border-orange-400'}`}>{env.note}</div>}

        {env?.mode === 'live' && d && (
          <>
            <div className="card flex flex-wrap items-center gap-4">
              <ScoreRing score={d.score} cls={STATUS[d.status].cls} />
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-bold">{STATUS[d.status].icon} {t(`sat.status.${d.status}`)}</div>
                <div className="text-sm text-gray-600">{t('sat.imageDate', { date: new Date(`${d.image_date}T00:00`).toLocaleDateString() })}</div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 text-sm">
                  <span className="text-gray-500">{t('sat.ndvi')}</span><b>{d.ndvi.toFixed(2)}</b>
                  <span className="text-gray-500">{t('sat.ndmi')}</span><b>{d.ndmi.toFixed(2)}</b>
                  {d.change != null && <><span className="text-gray-500">{t('sat.change')}</span><b className={d.change < 0 ? 'text-red-700' : 'text-green-700'}>{d.change > 0 ? '+' : ''}{d.change.toFixed(2)}</b></>}
                </div>
              </div>
            </div>

            {d.flags.length > 0 && (
              <div className="card space-y-1 text-sm">
                {d.flags.map((f) => <p key={f}>{t(`sat.flag.${f}`, { pct: d.low_patch_pct })}</p>)}
              </div>
            )}

            <div className="card">
              <h2 className="mb-1 font-semibold">📈 {t('sat.trend')}</h2>
              <NdviChart series={d.series} lang={lang} />
              <p className="text-xs text-gray-500">{t('sat.trendHint')}</p>
            </div>

            <div className="card">
              <h2 className="mb-2 font-semibold">🗺️ {t('sat.area')}</h2>
              <MapContainer center={[env.location.lat, env.location.lon]} zoom={15} style={{ height: 240 }} className="rounded-xl">
                <TileLayer attribution="Imagery &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                <Circle center={[env.location.lat, env.location.lon]} radius={165} pathOptions={{ color: '#facc15', weight: 2, fillOpacity: 0.05 }} />
              </MapContainer>
              <p className="mt-1 text-xs text-gray-500">{t('sat.areaHint')}</p>
            </div>

            <ShareButtons text={t('sat.shareText', { status: t(`sat.status.${d.status}`), score: d.score, date: d.image_date })} />
          </>
        )}

        {env?.mode === 'fallback' && (
          d?.estimate ? (
            <div className="card space-y-2">
              <div className="text-lg font-semibold">💧 {t('sat.estimateTitle')}: {d.estimate.water_score}/100</div>
              <p className="text-sm text-gray-600">{t('sat.estimateText', { rain: d.estimate.rain_7d, et: d.estimate.et0_7d })}</p>
              <p className="text-xs text-orange-700">{t('sat.estimateNote')}</p>
            </div>
          ) : (
            <div className="card">{t('weather.noData')}</div>
          )
        )}
      </FarmDataGate>
      <p className="text-[11px] text-gray-400">{t('sat.attribution')}</p>
    </div>
  )
}
