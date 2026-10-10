import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import ShareButtons from './ShareButtons.jsx'

const SEVERITY = { info: 'border-blue-400', warning: 'border-orange-400', danger: 'border-red-500' }

export default function NotificationBell() {
  const { t } = useTranslation()
  const [data, setData] = useState({ unread: 0, items: [] })
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const ref = useRef(null)

  const load = () => api('/notifications').then(setData).catch(() => {})

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const openItem = async (n) => {
    setExpanded(expanded === n.id ? null : n.id)
    if (!n.is_read) {
      await api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => {})
      load()
    }
  }

  const readAll = async () => {
    await api('/notifications/read-all', { method: 'POST' }).catch(() => {})
    load()
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative rounded-full p-2 text-xl hover:bg-cream-200" aria-label={t('notif.title')}>
        🔔
        {data.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-red-600 px-1 text-xs font-bold text-white">{data.unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 max-h-[70vh] w-[min(92vw,380px)] overflow-y-auto rounded-2xl bg-white p-3 shadow-xl ring-1 ring-gray-200">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">{t('notif.title')}</span>
            {data.unread > 0 && <button onClick={readAll} className="text-xs text-brand-700 underline">{t('notif.readAll')}</button>}
          </div>
          {data.items.length === 0 && <p className="py-4 text-center text-sm text-gray-500">{t('notif.empty')}</p>}
          <ul className="space-y-2">
            {data.items.map((n) => (
              <li key={n.id} className={`rounded-xl border-l-4 bg-gray-50 p-2 ${SEVERITY[n.severity] || SEVERITY.info}`}>
                <button className="w-full text-left" onClick={() => openItem(n)}>
                  <div className={`text-sm ${n.is_read ? '' : 'font-bold'}`}>{n.title}</div>
                  <div className="text-xs text-gray-600">{n.text}</div>
                  <div className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleString()}</div>
                </button>
                {expanded === n.id && n.text && (
                  <div className="mt-2">
                    <ShareButtons text={n.text} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
