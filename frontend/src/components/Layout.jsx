import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import NotificationBell from './NotificationBell.jsx'
import InstallPrompt from './InstallPrompt.jsx'
import ServerStatusBanner from './ServerStatusBanner.jsx'

// All app sections (sidebar on desktop, dashboard grid; mobile shows MOBILE + "More" → dashboard grid)
export const NAV = [
  { to: '/', key: 'dashboard', icon: '🏠', ready: true },
  { to: '/farm', key: 'farm', icon: '🌾', ready: true },
  { to: '/scan', key: 'scan', icon: '🦠', ready: true },
  { to: '/crop', key: 'crop', icon: '🌱', ready: true },
  { to: '/irrigation', key: 'irrigation', icon: '💧', ready: true },
  { to: '/weather', key: 'weather', icon: '🌦️', ready: true },
  { to: '/radar', key: 'radar', icon: '📡', ready: true },
  { to: '/satellite', key: 'satellite', icon: '🛰️', ready: true },
  { to: '/assistant', key: 'assistant', icon: '💬', ready: true },
  { to: '/messages', key: 'messages', icon: '📨', ready: true },
  { to: '/family', key: 'family', icon: '👨‍👩‍👦', ready: true },
  { to: '/market', key: 'market', icon: '🚜', ready: true },
  { to: '/schemes', key: 'schemes', icon: '🏛️', ready: true },
  { to: '/status', key: 'status', icon: '🔀', ready: true },
]
const MOBILE = ['/', '/scan', '/assistant', '/messages']

export default function Layout() {
  const { t } = useTranslation()
  const { user, logout, actingFor } = useAuth()
  const items = NAV.filter((n) => n.ready)
  const mobileItems = [...items.filter((n) => MOBILE.includes(n.to)), { to: '/more', key: 'more', icon: '☰' }]

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pl-60">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r bg-white p-4 md:flex">
        <div className="mb-6 text-2xl font-extrabold text-brand-700">🌾 {t('app.name')}</div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50'}`
              }
            >
              {n.icon} {t(`nav.${n.key}`)}
            </NavLink>
          ))}
        </nav>
        <button onClick={logout} className="btn-outline mt-4">
          {t('common.logout')}
        </button>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-[1000] flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <div className="font-bold text-brand-700 md:hidden">🌾 {t('app.name')}</div>
          <div className="truncate text-sm text-gray-600">
            {user?.name} · {t(`auth.${user?.role}`)}
            {user?.role === 'helper' && actingFor && <> · {t('dashboard.actingFor', { name: actingFor.name })}</>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <LanguageSwitcher />
          <button onClick={logout} className="text-sm text-gray-500 underline md:hidden">
            {t('common.logout')}
          </button>
        </div>
      </header>
      <ServerStatusBanner />
      <InstallPrompt />

      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-[1000] flex justify-around border-t bg-white py-2 md:hidden">
        {mobileItems.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => `flex flex-col items-center text-xs ${isActive ? 'text-brand-700' : 'text-gray-500'}`}
          >
            <span className="text-xl">{n.icon}</span>
            {t(`nav.${n.key}`)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
