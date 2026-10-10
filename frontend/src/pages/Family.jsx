import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api'
import HelpMeButton from '../components/HelpMeButton.jsx'

export default function Family() {
  const { t } = useTranslation()
  const { user, setUser, actingFor, setActingFor } = useAuth()
  const [people, setPeople] = useState([])
  const [code, setCode] = useState('')
  const [relation, setRelation] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const isFarmer = user.role === 'farmer'

  const load = () => api('/family').then((list) => {
    setPeople(list)
    // keep helper's acting-for permission in sync
    if (!isFarmer && actingFor) {
      const fresh = list.find((p) => p.user_id === actingFor.user_id)
      setActingFor(fresh || null)
    }
  }).catch((e) => setError(e.message))

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const link = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const p = await api('/family/link', { method: 'POST', body: { code: code.trim(), relation } })
      setCode('')
      setRelation('')
      await load()
      setActingFor(p)
    } catch (err) {
      setError(err.message)
    }
  }

  const togglePermission = async (p) => {
    await api(`/family/${p.link_id}`, { method: 'PATCH', body: { can_edit: !p.can_edit } })
    load()
  }

  const unlink = async (p) => {
    if (!window.confirm(t('family.confirmUnlink', { name: p.name }))) return
    await api(`/family/${p.link_id}`, { method: 'DELETE' })
    if (actingFor?.user_id === p.user_id) setActingFor(null)
    load()
  }

  const newCode = async () => setUser(await api('/auth/me/link-code', { method: 'POST' }))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">👨‍👩‍👦 {t('nav.family')}</h1>

      {isFarmer ? (
        <>
          <div className="card text-center">
            <div className="text-sm text-gray-600">{t('dashboard.linkCode')}</div>
            <div className="my-2 font-mono text-4xl font-bold tracking-[0.3em] text-brand-700">{user.link_code}</div>
            <p className="text-sm text-gray-600">{t('family.shareCodeHint')}</p>
            <button onClick={newCode} className="mt-2 text-xs text-gray-500 underline">{t('family.newCode')}</button>
          </div>
          <HelpMeButton />
        </>
      ) : (
        <form onSubmit={link} className="card space-y-3">
          <h2 className="font-semibold">{t('family.linkFarmer')}</h2>
          <p className="text-sm text-gray-600">{t('family.linkFarmerHint')}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <input className="input font-mono tracking-widest" inputMode="numeric" maxLength={6} pattern="\d{6}" placeholder="123456"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} required aria-label={t('dashboard.linkCode')} />
            <input className="input" placeholder={t('family.relationPh')} value={relation} onChange={(e) => setRelation(e.target.value)} maxLength={40} />
            <button className="btn-primary">{t('family.link')}</button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card">
        <h2 className="mb-2 font-semibold">{isFarmer ? t('family.myHelpers') : t('family.farmersIHelp')}</h2>
        {people.length === 0 && <p className="text-sm text-gray-500">{isFarmer ? t('family.noHelpers') : t('family.noFarmers')}</p>}
        <ul className="divide-y">
          {people.map((p) => (
            <li key={p.link_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <div className="font-medium">{p.name} {p.relation && <span className="text-sm text-gray-500">· {p.relation}</span>}</div>
                <div className="text-xs text-gray-500">{p.phone} · {p.can_edit ? t('family.canEdit') : t('family.viewOnly')}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {isFarmer ? (
                  <button onClick={() => togglePermission(p)} className="btn-outline text-sm">
                    {p.can_edit ? t('family.makeViewOnly') : t('family.allowEdit')}
                  </button>
                ) : (
                  <button
                    onClick={() => { setActingFor(p); navigate('/') }}
                    className={actingFor?.user_id === p.user_id ? 'btn-primary text-sm' : 'btn-outline text-sm'}
                  >
                    {actingFor?.user_id === p.user_id ? `✓ ${t('family.helping')}` : t('family.helpThisFarmer')}
                  </button>
                )}
                <button onClick={() => unlink(p)} className="btn-outline text-sm text-red-600">{t('family.unlink')}</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
