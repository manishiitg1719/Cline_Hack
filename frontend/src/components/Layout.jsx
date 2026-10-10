import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import NotificationBell from './NotificationBell.jsx'
import InstallPrompt from './InstallPrompt.jsx'
import ServerStatusBanner from './ServerStatusBanner.jsx'

// All app sections (top bar + "More" menu on desktop, dashboard grid; mobile bottom bar + menu)
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
// Shown directly in the top bar on wide screens; everything else goes under "More".
const PRIMARY = ['/', '/scan', '/weather', '/irrigation', '/crop', '/schemes']
const MOBILE = ['/', '/scan', '/assistant', '/schemes']

const pillCls = ({ isActive }) =>
  `nav-pill ${isActive ? 'bg-forest-900 text-cream-50 shadow-md' : 'text-forest-900 hover:bg-cream-200/70'}`

export default function Layout() {
  const { t } = useTranslation()
  const { user, logout, actingFor } = useAuth()
  const location = useLocation()
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)

  const items = NAV.filter((n) => n.ready)
  const primary = items.filter((n) => PRIMARY.includes(n.to))
  const moreItems = items.filter((n) => !PRIMARY.includes(n.to))
  const mobileItems = [...items.filter((n) => MOBILE.includes(n.to)), { to: '/more', key: 'more', icon: '☰' }]
  const moreActive = moreItems.some((n) => location.pathname.startsWith(n.to))

  // Close the menu on navigation, outside click and Escape.
  useEffect(() => setMenu(false), [location.pathname])
  useEffect(() => {
    if (!menu) return
    const onDown = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false)
    const onKey = (e) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])

  const userLine = (
    <>
      {user?.name} · {t(`auth.${user?.role}`)}
      {user?.role === 'helper' && actingFor && <> · {t('dashboard.actingFor', { name: actingFor.name })}</>}
    </>
  )

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-[1000] border-b border-cream-200 bg-[#f4efe6]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-forest-900 text-2xl shadow-md">🌾</span>
            <span className="text-xl font-extrabold text-forest-900 md:text-2xl">
              Farm<span className="text-accent-500">Guard</span>
            </span>
          </Link>

          {/* Wide screens: main pages as pills */}
          <nav className="ml-2 hidden flex-1 items-center gap-1 xl:flex">
            {primary.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={pillCls}>
                <span>{n.icon}</span> {t(`nav.${n.key}`)}
              </NavLink>
            ))}
          </nav>
          <div className="flex-1 xl:hidden" />

          <div className="relative flex items-center gap-2" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              className={`nav-pill ${menu || moreActive ? 'bg-cream-200 text-forest-900' : 'text-forest-900 hover:bg-cream-200/70'}`}
            >
              <span className="hidden xl:inline">•••</span>
              <span className="xl:hidden">☰</span>
              <span className="hidden sm:inline">{t('nav.more')}</span>
              <span className={`text-xs transition ${menu ? 'rotate-180' : ''}`}>▾</span>
            </button>

            {menu && (
              <div className="absolute right-0 top-full z-[1001] mt-2 max-h-[calc(100vh-6rem)] w-[min(92vw,22rem)] overflow-y-auto rounded-3xl bg-cream-50 p-3 shadow-2xl ring-1 ring-cream-200">
                <div className="px-3 pb-2 pt-1 text-sm text-gray-600">{userLine}</div>
                {/* On narrow screens show every page here; on wide screens only the extra ones */}
                <nav className="grid gap-1">
                  {items.map((n) => (
                    <NavLink
                      key={n.to}
                      to={n.to}
                      end={n.to === '/'}
                      className={({ isActive }) =>
                        `${PRIMARY.includes(n.to) ? 'xl:hidden ' : ''}flex items-center gap-3 rounded-2xl px-3 py-2.5 font-semibold ${
                          isActive ? 'bg-forest-900 text-cream-50' : 'text-forest-900 hover:bg-cream-200/70'
                        }`
                      }
                    >
                      <span className="text-lg">{n.icon}</span> {t(`nav.${n.key}`)}
                    </NavLink>
                  ))}
                </nav>
                <div className="mt-2 flex items-center justify-between gap-2 border-t border-cream-200 px-2 pt-3">
                  <LanguageSwitcher className="sm:hidden" />
                  <button onClick={logout} className="btn-outline ml-auto py-2 text-sm">
                    {t('common.logout')}
                  </button>
                </div>
              </div>
            )}

            <NotificationBell />
            <LanguageSwitcher className="hidden sm:inline-flex" />
            <Link to="/scan" className="btn-accent hidden whitespace-nowrap py-2 2xl:inline-flex">
              🔍 {t('layout.newScan')}
            </Link>
          </div>
        </div>
      </header>
      <ServerStatusBanner />
      <InstallPrompt />

      <main className="mx-auto max-w-7xl p-4 md:px-6 md:py-6">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-[1000] flex justify-around border-t border-cream-200 bg-cream-50/95 py-2 backdrop-blur md:hidden">
        {mobileItems.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) => `flex flex-col items-center text-xs font-semibold ${isActive ? 'text-accent-600' : 'text-forest-700'}`}
          >
            <span className="text-xl">{n.icon}</span>
            {t(`nav.${n.key}`)}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
