import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'

export function AuthShell({ children }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <div className="mb-6 text-center">
          <div className="text-5xl">🌾</div>
          <h1 className="text-3xl font-extrabold text-brand-700">{t('app.name')}</h1>
          <p className="mt-1 text-sm text-gray-600">{t('app.tagline')}</p>
        </div>
        <div className="card">{children}</div>
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
    <AuthShell>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-xl font-bold">{t('auth.login')}</h2>
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
