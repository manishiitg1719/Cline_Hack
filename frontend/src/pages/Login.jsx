import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'

// Phrases cycled in the "Speaks" box (the app speaks Hindi + English).
const SPEAK_WORDS = ['फसल की सलाह', 'Crop advice', 'सिंचाई कब करें', 'When to water', 'बीमारी की जाँच', 'Disease check']

// Wide letter-spacing + uppercase only for Latin text — spacing breaks Devanagari conjuncts.
const trackCls = (lng) => (lng === 'en' ? 'uppercase tracking-[0.18em]' : 'tracking-normal')

function SpeaksTicker() {
  const { t, i18n } = useTranslation()
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % SPEAK_WORDS.length), 2200)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="inline-flex min-w-[17rem] items-center gap-4 rounded-2xl bg-black/30 px-5 py-3.5 ring-1 ring-white/15 backdrop-blur-md">
      <span className={`text-xs font-bold text-white/70 ${trackCls(i18n.language)}`}>{t('landing.speaks')}</span>
      <span key={i} className="fg-fade-up font-serif text-xl font-bold text-white">{SPEAK_WORDS[i]}</span>
      <span className="ml-auto flex gap-1" aria-hidden>
        {SPEAK_WORDS.map((_, n) => (
          <span key={n} className={`h-1.5 w-1.5 rounded-full ${n === i ? 'bg-lime-300' : 'bg-white/30'}`} />
        ))}
      </span>
    </div>
  )
}

/** Full-screen sunny field hero used by Login + Register. `alt` = top-right button {to, label}. */
export function AuthShell({ children, alt }) {
  const { t, i18n } = useTranslation()
  return (
    <div className="relative isolate min-h-screen overflow-hidden text-white">
      <div className="hero-bg absolute inset-0 -z-10" aria-hidden />
      <div className="hero-sun pointer-events-none absolute -z-10" aria-hidden />

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-3 pb-8 pt-3 sm:px-6 sm:pt-5">
        {/* Floating glass top bar */}
        <header className="flex items-center justify-between gap-3 rounded-2xl bg-black/25 px-3 py-2 ring-1 ring-white/20 backdrop-blur-md sm:px-5 sm:py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/90 text-xl shadow">🌾</span>
            <span className="truncate font-serif text-xl font-bold tracking-wide">{t('app.name')}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {alt && (
              <Link to={alt.to} className="hidden rounded-xl bg-gray-900/85 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-gray-900 sm:inline-flex">
                {alt.label}
              </Link>
            )}
          </div>
        </header>

        <div className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
          {/* Hero text */}
          <section className="space-y-5">
            <span className={`inline-flex items-center gap-2 rounded-full bg-emerald-950/40 px-3 py-1.5 text-xs font-bold ${trackCls(i18n.language)} ring-1 ring-emerald-200/40 backdrop-blur`}>
              <span className="h-2 w-2 animate-pulse rounded-full bg-lime-300" />
              {t('landing.badge')}
            </span>
            <h1 className="hero-title font-serif text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
              {t('landing.line1')}
              <br />
              {t('landing.line2')}
              <br />
              {t('landing.line3')}{' '}
              <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-lime-300 bg-clip-text text-transparent">{t('landing.highlight')}</span>
            </h1>
            <p className="hidden max-w-xl text-lg leading-relaxed text-white/90 drop-shadow sm:block">{t('landing.sub')}</p>
            <div className="hidden flex-wrap gap-2 sm:flex">
              {['f1', 'f2', 'f3'].map((k) => (
                <span key={k} className="rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/25 backdrop-blur">{t(`landing.${k}`)}</span>
              ))}
            </div>
            <SpeaksTicker />
          </section>

          {/* Form card */}
          <div className="w-full max-w-md justify-self-center lg:justify-self-end">
            <div className="fg-fade-up rounded-3xl bg-white/90 p-5 text-gray-900 shadow-2xl ring-1 ring-white/60 backdrop-blur-md sm:p-7">
              {children}
            </div>
            <p className="mt-3 text-center text-xs text-white/80 drop-shadow">{t('app.tagline')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Login() {
  const { t } = useTranslation()
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await login(phone.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell alt={{ to: '/register', label: t('auth.register') }}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <h2 className="font-serif text-2xl font-bold">{t('landing.welcome')}</h2>
          <p className="text-sm text-gray-600">{t('landing.loginHint')}</p>
        </div>
        <div>
          <label className="label" htmlFor="phone">{t('auth.phone')}</label>
          <input id="phone" className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="password">{t('auth.password')}</label>
          <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? t('common.loading') : t('auth.login')}</button>
        <Link to="/register" className="block text-center text-sm text-brand-700 underline">{t('auth.noAccount')}</Link>
      </form>
    </AuthShell>
  )
}
