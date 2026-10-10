import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { smsLink, whatsappLink } from '../lib/messages'

// WhatsApp / SMS / Copy / native Share for an already-written message.
// The user always presses "Send" inside WhatsApp/SMS themselves.
export default function ShareButtons({ text, phone }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const disabled = !text?.trim()

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: ignore */
    }
  }

  const share = () => navigator.share?.({ text }).catch(() => {})

  const linkCls = `btn ${disabled ? 'pointer-events-none opacity-50' : ''}`
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <a href={whatsappLink(text, phone)} target="_blank" rel="noreferrer" className={`${linkCls} bg-[#25D366] text-white`}>
        🟢 {t('msg.whatsapp')}
      </a>
      <a href={smsLink(text, phone)} className={`${linkCls} bg-blue-600 text-white`}>
        ✉️ {t('msg.sms')}
      </a>
      <button type="button" onClick={copy} disabled={disabled} className="btn-outline">
        📋 {copied ? t('msg.copied') : t('msg.copy')}
      </button>
      {typeof navigator !== 'undefined' && navigator.share && (
        <button type="button" onClick={share} disabled={disabled} className="btn-outline">
          🔗 {t('msg.share')}
        </button>
      )}
    </div>
  )
}
