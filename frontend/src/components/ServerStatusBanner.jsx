import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Polls /api/health every 10 s and shows a clear banner when the server can't be reached,
// so a closed server window is never mistaken for "no internet".
// down = 'backend' (frontend up, backend closed) | 'app' (frontend server closed) | 'offline' (no internet)
export default function ServerStatusBanner() {
  const { t } = useTranslation()
  const [down, setDown] = useState(null)

  useEffect(() => {
    let alive = true
    const check = async () => {
      if (!navigator.onLine) return alive && setDown('offline')
      try {
        const r = await fetch('/api/health', { cache: 'no-store' })
        const ok = r.ok && (await r.json().catch(() => null))?.status === 'ok'
        if (alive) setDown(ok ? null : 'backend')
      } catch {
        if (alive) setDown('app')
      }
    }
    check()
    const id = setInterval(check, 10_000)
    window.addEventListener('online', check)
    window.addEventListener('offline', check)
    return () => {
      alive = false
      clearInterval(id)
      window.removeEventListener('online', check)
      window.removeEventListener('offline', check)
    }
  }, [])

  if (!down) return null
  return (
    <div role="alert" className={`px-4 py-2 text-center text-sm font-semibold text-white ${down === 'offline' ? 'bg-orange-500' : 'bg-red-600'}`}>
      {down === 'offline' ? '📴 ' : '⚠️ '}
      {t(`server.${down}`)}
    </div>
  )
}
