import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

// "Install app" button (Android/Chrome). Connection problems are shown by ServerStatusBanner.
export default function InstallPrompt() {
  const { t } = useTranslation()
  const [deferred, setDeferred] = useState(null)

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const install = async () => {
    deferred.prompt()
    await deferred.userChoice.catch(() => {})
    setDeferred(null)
  }

  return (
    <>
      {deferred && (
        <div className="flex items-center justify-between gap-2 bg-brand-50 px-4 py-2 text-sm">
          <span>📲 {t('pwa.installHint')}</span>
          <button onClick={install} className="btn-primary px-3 py-1 text-sm">{t('pwa.install')}</button>
        </div>
      )}
    </>
  )
}
