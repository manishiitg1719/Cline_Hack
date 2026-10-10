import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { NAV } from './Layout.jsx'

// Tile grid of every app section (dashboard + mobile "More" page).
export default function FeatureGrid() {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {NAV.filter((n) => n.to !== '/' && n.ready).map((n) => (
        <Link key={n.to} to={n.to} className="card p-3 text-center hover:ring-brand-500">
          <div className="text-3xl">{n.icon}</div>
          <div className="mt-1 text-sm font-semibold leading-tight">{t(`nav.${n.key}`)}</div>
        </Link>
      ))}
    </div>
  )
}

export function MorePage() {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">☰ {t('nav.more')}</h1>
      <FeatureGrid />
    </div>
  )
}
