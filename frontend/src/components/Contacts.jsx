import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'

const CATS = ['family', 'officer', 'supplier', 'other']
const EMPTY = { name: '', phone: '', category: 'family', language: 'hi' }

export default function Contacts({ contacts, onChange }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(EMPTY)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const add = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api('/contacts', { method: 'POST', body: { ...form, phone: form.phone.replace(/\s/g, '') } })
      setForm(EMPTY)
      setOpen(false)
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (id) => {
    await api(`/contacts/${id}`, { method: 'DELETE' })
    onChange()
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">📒 {t('contacts.title')}</h2>
        <button className="btn-outline text-sm" onClick={() => setOpen(!open)}>{open ? t('common.cancel') : `+ ${t('contacts.add')}`}</button>
      </div>

      {open && (
        <form onSubmit={add} className="grid gap-2 sm:grid-cols-2">
          <input className="input" placeholder={t('auth.name')} value={form.name} onChange={set('name')} required />
          <input className="input" placeholder={t('auth.phone')} inputMode="tel" value={form.phone} onChange={set('phone')} required pattern="\+?[\d\s]{10,16}" />
          <select className="input" value={form.category} onChange={set('category')}>
            {CATS.map((c) => <option key={c} value={c}>{t(`contacts.cat.${c}`)}</option>)}
          </select>
          <select className="input" value={form.language} onChange={set('language')} aria-label={t('common.language')}>
            <option value="hi">हिंदी</option>
            <option value="en">English</option>
          </select>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <button className="btn-primary sm:col-span-2">{t('common.save')}</button>
        </form>
      )}

      {contacts.length === 0 && !open && <p className="text-sm text-gray-500">{t('contacts.empty')}</p>}
      <ul className="divide-y">
        {contacts.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-2">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-gray-500">{c.phone} · {t(`contacts.cat.${c.category}`)} · {c.language === 'hi' ? 'हिंदी' : 'English'}</div>
            </div>
            <button onClick={() => remove(c.id)} className="text-sm text-red-600" aria-label={t('contacts.delete')}>🗑️</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
