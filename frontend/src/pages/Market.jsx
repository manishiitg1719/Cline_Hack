import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import ChipGroup from '../components/ChipGroup.jsx'
import ListingForm from '../components/ListingForm.jsx'
import { LISTING_CATEGORIES as CATEGORIES } from '../lib/options'

export default function Market() {
  const { t } = useTranslation()
  const [kind, setKind] = useState('equipment')
  const [category, setCategory] = useState('')
  const [mine, setMine] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(() => {
    setError('')
    api('/listings', { params: { kind, category: category || undefined, mine: mine || undefined } })
      .then(setData).catch((e) => setError(e.status === 0 ? t('common.offline') : e.message))
  }, [kind, category, mine, t])
  useEffect(() => { load() }, [load])

  const remove = async (id) => {
    await api(`/listings/${id}`, { method: 'DELETE' })
    load()
  }

  const price = (l) => (l.unit === 'free' || l.price === 0 ? t('market.free') : l.price != null ? `₹${l.price.toLocaleString('en-IN')}${l.unit ? ` / ${t(`market.unit.${l.unit}`)}` : ''}` : t('market.askPrice'))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🚜 {t('nav.market')}</h1>
      <ChipGroup options={['equipment', 'waste']} value={kind} onChange={(k) => { setKind(k); setCategory(''); setShowForm(false) }} labelOf={(k) => t(`market.kind.${k}`)} />
      <p className="text-sm text-gray-600">{t(`market.intro.${kind}`)}</p>
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t('market.category')}>
          <option value="">{t('market.all')}</option>
          {CATEGORIES[kind].map((c) => <option key={c} value={c}>{t(`market.cat.${c}`)}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> {t('market.mine')}</label>
        <button className="btn-primary ml-auto text-sm" onClick={() => setShowForm(!showForm)}>{showForm ? t('common.cancel') : `+ ${t('market.add')}`}</button>
      </div>
      {showForm && <ListingForm kind={kind} onDone={() => { setShowForm(false); load() }} />}
      {error && <div className="card text-red-700">{error}</div>}
      {data && !data.has_location && <div className="card border-l-4 border-orange-400 text-sm">{t('market.noLocation')}</div>}
      {data?.items.length === 0 && <div className="card text-sm text-gray-500">{t('market.empty')}</div>}
      {data?.items.map((l) => (
        <div key={l.id} className="card space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold">{l.title}</div>
              <div className="text-xs text-gray-500">{t(`market.cat.${l.category}`)} · {l.owner_name}{l.village && ` · ${l.village}`}{l.distance_km != null && ` · ${l.distance_km} km`}</div>
            </div>
            <div className="shrink-0 font-bold text-brand-700">{price(l)}</div>
          </div>
          {l.description && <p className="text-sm text-gray-700">{l.description}</p>}
          <div className="flex gap-2 pt-1">
            {l.mine ? (
              <button onClick={() => remove(l.id)} className="btn-outline text-sm text-red-600">{t('market.remove')}</button>
            ) : (
              <>
                <a href={l.whatsapp} target="_blank" rel="noreferrer" className="btn bg-[#25D366] text-sm text-white">🟢 WhatsApp</a>
                <a href={`tel:${l.phone}`} className="btn-outline text-sm">📞 {t('market.call')}</a>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
