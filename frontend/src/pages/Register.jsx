import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import { AuthShell } from './Login.jsx'

export default function Register() {
  const { t, i18n } = useTranslation()
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', password: '', role: 'farmer' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await register({ ...form, phone: form.phone.replace(/\s/g, ''), language: i18n.language === 'en' ? 'en' : 'hi' })
      navigate(form.role === 'farmer' ? '/farm' : '/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const RoleCard = ({ value, icon }) => (
    <button
      type="button"
      onClick={() => setForm({ ...form, role: value })}
      className={`rounded-xl border-2 p-3 text-left ${form.role === value ? 'border-brand-600 bg-brand-50' : 'border-gray-200'}`}
    >
      <div className="text-2xl">{icon}</div>
      <div className="font-semibold">{t(`auth.${value}`)}</div>
      <div className="text-xs text-gray-600">{t(`auth.${value}Hint`)}</div>
    </button>
  )

  return (
    <AuthShell>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-xl font-bold">{t('auth.register')}</h2>
        <div>
          <span className="label">{t('auth.iAm')}</span>
          <div className="grid grid-cols-2 gap-2">
            <RoleCard value="farmer" icon="👨‍🌾" />
            <RoleCard value="helper" icon="👨‍👩‍👦" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="name">{t('auth.name')}</label>
          <input id="name" className="input" value={form.name} onChange={set('name')} required minLength={2} />
        </div>
        <div>
          <label className="label" htmlFor="phone">{t('auth.phone')}</label>
          <input id="phone" className="input" inputMode="tel" value={form.phone} onChange={set('phone')} required pattern="\+?[\d\s]{10,16}" />
        </div>
        <div>
          <label className="label" htmlFor="password">{t('auth.password')}</label>
          <input id="password" type="password" className="input" value={form.password} onChange={set('password')} required minLength={6} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? t('common.loading') : t('auth.register')}</button>
        <Link to="/login" className="block text-center text-sm text-brand-700 underline">{t('auth.haveAccount')}</Link>
      </form>
    </AuthShell>
  )
}
