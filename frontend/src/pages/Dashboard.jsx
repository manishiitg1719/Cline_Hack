import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import FeatureGrid from '../components/FeatureGrid.jsx'
import { api } from '../api'
import RadarBanner from '../components/RadarBanner.jsx'
import ModeBadge from '../components/ModeBadge.jsx'
import { useFarmData } from '../hooks/useFarmData'
import { DECISION_STYLE } from '../lib/weather'

const ACTIONS = [
  { to: '/scan', icon: '🔍', key: 'scan' },
  { to: '/crop', icon: '🌱', key: 'crop' },
  { to: '/assistant', icon: '💬', key: 'assistant' },
  { to: '/schemes', icon: '🏛️', key: 'schemes' },
]

function Stat({ value, label }) {
  return (
    <div className="rounded-3xl bg-white/90 px-3 py-4 text-center shadow-sm ring-1 ring-white">
      <div className="text-3xl font-extrabold text-forest-900 md:text-4xl">{value}</div>
      <div className="eyebrow mt-1 text-forest-700">{label}</div>
    </div>
  )
}

export default function Dashboard() {
  const { t, i18n } = useTranslation()
  const { user, actingFor, farmerParam } = useAuth()
  const [farm, setFarm] = useState(null)
  const [online, setOnline] = useState(navigator.onLine)
  const isHelper = user.role === 'helper'
  const weather = useFarmData('/weather')
  const irrigation = useFarmData('/irrigation')

  useEffect(() => {
    if (isHelper && !actingFor) return
    api('/farm', { params: farmerParam }).then(setFarm).catch(() => setFarm(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingFor?.user_id])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const profileIncomplete = farm && (farm.latitude == null || !farm.current_crop)
  const weekday = new Date().toLocaleDateString(i18n.language === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long' })
  const wx = weather.data?.data
  const ir = irrigation.data?.data
  const dash = '—'

  return (
    <div className="space-y-6">
      {/* Row 1: hero + photo */}
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section className="fg-fade-up rounded-[2.25rem] bg-forest-900 p-7 text-cream-50 shadow-xl md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="eyebrow text-accent-300">🌾 {t('dashboard.brief', { day: weekday })}</div>
            <div className="flex items-center gap-2 text-sm font-bold text-cream-100">
              <span className={`h-3 w-3 rounded-full ring-4 ${online ? 'bg-green-400 ring-green-400/25' : 'bg-orange-400 ring-orange-400/25'}`} />
              {online ? t('dashboard.liveOn') : t('dashboard.liveOff')}
            </div>
          </div>
          <h1 className="mt-6 text-4xl font-extrabold leading-tight md:text-6xl">{t('dashboard.hello', { name: user.name })}</h1>
          <div className="mt-1 font-serif text-4xl italic text-accent-300 md:text-6xl">{t('dashboard.heroAccent')}</div>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream-100/90">{t('dashboard.heroSub')}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/scan" className="btn-accent px-7 py-3.5 text-lg">🔍 {t('dashboard.startScan')} ↗</Link>
            <Link to="/assistant" className="btn border border-cream-50/30 px-6 py-3.5 text-lg text-cream-50 hover:bg-cream-50/10">
              💬 {t('nav.assistant')}
            </Link>
          </div>
        </section>

        <section
          className="relative flex min-h-[20rem] items-end overflow-hidden rounded-[2.25rem] bg-cover bg-center p-5 shadow-xl"
          style={{ backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(18,38,31,0.55) 100%), url('/img/field-sun.webp')" }}
        >
          <div className="w-full rounded-3xl bg-cream-50/95 p-5 shadow-lg backdrop-blur">
            <div className="eyebrow text-accent-600">✅ {t('dashboard.scannerReady')}</div>
            <div className="mt-2 text-lg font-extrabold leading-snug text-forest-900 md:text-xl">{t('dashboard.scannerText')}</div>
          </div>
        </section>
      </div>

      {isHelper && !actingFor && <div className="card border-l-4 border-accent-500">{t('dashboard.selectFarmer')}</div>}

      {profileIncomplete && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-l-4 border-accent-500">
          <p>{t('dashboard.completeProfile')}</p>
          <Link to="/farm" className="btn-primary">{t('dashboard.goToFarm')}</Link>
        </div>
      )}

      {farm && !profileIncomplete && <RadarBanner />}

      {/* Row 2: action hub + field summary */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[2.25rem] bg-cream-100 p-6 shadow-lg ring-1 ring-cream-200 md:p-8">
          <div className="eyebrow text-accent-600">✨ {t('dashboard.hub')}</div>
          <h2 className="mt-2 text-3xl font-extrabold text-forest-900 md:text-4xl">{t('dashboard.hubTitle')}</h2>
          <div className="mt-6 grid gap-3">
            {ACTIONS.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="group flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-cream-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-100 text-2xl">{a.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-extrabold text-forest-900">{t(`dashboard.act.${a.key}`)}</span>
                  <span className="block text-sm text-gray-600">{t(`dashboard.act.${a.key}Sub`)}</span>
                </span>
                <span className="text-2xl text-accent-500 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5">↗</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="flex flex-col rounded-[2.25rem] bg-sage-100 p-6 shadow-lg ring-2 ring-sage-200 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="eyebrow text-forest-900">🌿 {t('dashboard.summary')}</div>
            {weather.data ? <ModeBadge mode={weather.data.mode} /> : (
              <span className="rounded-full bg-forest-900 px-3 py-1 text-xs font-bold text-cream-50">{t('dashboard.ready')}</span>
            )}
          </div>
          <h2 className="mt-3 text-3xl font-extrabold leading-tight text-forest-900 md:text-4xl">{t('dashboard.summaryTitle')}</h2>
          <p className="mt-3 text-[15px] font-medium leading-relaxed text-forest-800">{t('dashboard.summaryText')}</p>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat value={wx ? `${Math.round(wx.current.temp)}°C` : dash} label={t('dashboard.temp')} />
            <Stat value={wx ? `${wx.rain_prob_24h}%` : dash} label={t('dashboard.rain')} />
            <Stat value={wx ? Math.round(wx.current.wind) : dash} label={t('dashboard.wind')} />
          </div>
          {ir && (
            <Link to="/irrigation" className={`mt-4 inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 font-bold ${DECISION_STYLE[ir.decision].cls}`}>
              {DECISION_STYLE[ir.decision].icon} {t(`irrigation.decision.${ir.decision}`)}
            </Link>
          )}
          <p className="mt-auto pt-5 text-sm font-semibold text-forest-800">
            {wx
              ? `✓ ${weather.data.mode === 'live' ? t('dashboard.wxLive') : t('dashboard.wxFallback')}`
              : weather.loading ? t('common.loading') : (
                <Link to="/farm" className="underline">{t('dashboard.wxNone')}</Link>
              )}
          </p>
        </section>
      </div>

      {user.role === 'farmer' && user.link_code && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <div className="eyebrow text-accent-600">👨‍👩‍👦 {t('dashboard.linkCode')}</div>
            <div className="mt-1 text-sm text-gray-600">{t('dashboard.linkCodeHint')}</div>
          </div>
          <div className="font-mono text-3xl font-bold tracking-[0.3em] text-forest-900">{user.link_code}</div>
        </div>
      )}

      <h2 className="pt-2 text-2xl font-extrabold text-forest-900">{t('dashboard.modules')}</h2>
      <FeatureGrid />
    </div>
  )
}
