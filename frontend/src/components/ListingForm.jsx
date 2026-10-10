import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { LISTING_CATEGORIES as CATEGORIES } from '../lib/options'

const UNITS = { equipment: ['hour', 'day', 'acre'], waste: ['quintal', 'tonne', 'trolley', 'free'] }

export default function ListingForm({ kind, onDone }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ category: CATEGORIES[kind][0], title: '', description: '', price: '', unit: UNITS[kind][0] })
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api('/listings', { method: 'POST', body: { kind, ...form, price: form.unit === 'free' ? 0 : form.price === '' ? null : Number(form.price) } })
      onDone()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <form onSubmit={submit} className="card grid gap-2 sm:grid-cols-2">
      <select className="input" value={form.category} onChange={set('category')} aria-label={t('market.category')}>
        {CATEGORIES[kind].map((c) => <option key={c} value={c}>{t(`market.cat.${c}`)}</option>)}
      </select>
      <input className="input" placeholder={t('market.titlePh')} value={form.title} onChange={set('title')} required minLength={3} maxLength={120} />
      <textarea className="input sm:col-span-2" rows={2} placeholder={t('market.descPh')} value={form.description} onChange={set('description')} maxLength={600} />
      <input className="input" type="number" min="0" placeholder={t('market.pricePh')} value={form.price} onChange={set('price')} disabled={form.unit === 'free'} />
      <select className="input" value={form.unit} onChange={set('unit')} aria-label={t('market.unitLabel')}>
        {UNITS[kind].map((u) => <option key={u} value={u}>{t(`market.unit.${u}`)}</option>)}
      </select>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <button className="btn-primary sm:col-span-2">{t('common.save')}</button>
      <p className="text-xs text-gray-500 sm:col-span-2">{t('market.privacy')}</p>
    </form>
  )
}
