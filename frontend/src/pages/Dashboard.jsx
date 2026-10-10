import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import { NAV } from '../components/Layout.jsx'
import { api } from '../api'

export default function Dashboard() {
  const { t } = useTranslation()
  const { user, actingFor, farmerParam } = useAuth()
  const [farm, setFarm] = useState(null)
  const isHelper = user.role === 'helper'

  useEffect(() => {
    if (isHelper && !actingFor) return
    api('/farm', { params: farmerParam }).then(setFarm).catch(() => setFarm(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actingFor?.user_id])

  const profileIncomplete = farm && (farm.latitude == null || !farm.current_crop)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('dashboard.hello', { name: user.name })}</h1>

      {isHelper && !actingFor && <div className="card border-l-4 border-orange-400">{t('dashboard.selectFarmer')}</div>}

      {profileIncomplete && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-l-4 border-brand-500">
          <p>{t('dashboard.completeProfile')}</p>
          <Link to="/farm" className="btn-primary">{t('dashboard.goToFarm')}</Link>
        </div>
      )}

      {user.role === 'farmer' && user.link_code && (
        <div className="card">
          <div className="text-sm text-gray-600">{t('dashboard.linkCode')}</div>
          <div className="my-1 font-mono text-3xl font-bold tracking-[0.3em] text-brand-700">{user.link_code}</div>
          <div className="text-xs text-gray-500">{t('dashboard.linkCodeHint')}</div>
        </div>
      )}

      <h2 className="pt-2 text-lg font-semibold">{t('dashboard.modules')}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {NAV.filter((n) => n.to !== '/').map((n) =>
          n.ready ? (
            <Link key={n.to} to={n.to} className="card text-center hover:ring-brand-500">
              <div className="text-3xl">{n.icon}</div>
              <div className="mt-1 font-semibold">{t(`nav.${n.key}`)}</div>
            </Link>
          ) : (
            <div key={n.to} className="card text-center opacity-50">
              <div className="text-3xl">{n.icon}</div>
              <div className="mt-1 font-semibold">{t(`nav.${n.key}`)}</div>
              <div className="text-xs text-gray-500">{t('common.comingSoon')}</div>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
