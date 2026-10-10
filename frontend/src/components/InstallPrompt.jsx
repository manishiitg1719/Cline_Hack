import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

// "Install app" button (Android/Chrome) + offline banner.
export default function InstallPrompt() {
  const { t } = useTranslation()
  const [deferred, setDeferred] = useState(null)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e) }
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  const install = async () => {
    deferred.prompt()
    await deferred.userChoice.catch(() => {})
    setDeferred(null)
  }

  return (
    <>
      {!online && <div className="bg-orange-500 px-4 py-1 text-center text-xs font-semibold text-white">📴 {t('pwa.offline')}</div>}
      {deferred && (
        <div className="flex items-center justify-between gap-2 bg-brand-50 px-4 py-2 text-sm">
          <span>📲 {t('pwa.installHint')}</span>
          <button onClick={install} className="btn-primary px-3 py-1 text-sm">{t('pwa.install')}</button>
        </div>
      )}
    </>
  )
}
