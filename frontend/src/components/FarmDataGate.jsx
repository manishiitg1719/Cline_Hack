import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

// Common loading / "set location" / "select farmer" / error states for farm-scoped pages.
export default function FarmDataGate({ state, children }) {
  const { t } = useTranslation()
  if (state.blocked) return <div className="card">{t('dashboard.selectFarmer')}</div>
  if (state.loading && !state.data) return <div className="card text-gray-500">{t('common.loading')}</div>
  if (state.errorStatus === 409)
    return (
      <div className="card flex flex-wrap items-center justify-between gap-3 border-l-4 border-brand-500">
        <p>{t('weather.needLocation')}</p>
        <Link to="/farm" className="btn-primary">{t('dashboard.goToFarm')}</Link>
      </div>
    )
  if (state.error)
    return <div className="card border-l-4 border-red-400 text-red-700">{state.error}</div>
  return children
}
