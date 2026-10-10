import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '../i18n'
import { useAuth } from '../context/AuthContext.jsx'

export default function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation()
  const { changeLanguage } = useAuth()
  return (
    <div className={`inline-flex rounded-xl bg-gray-100 p-1 ${className}`} role="group" aria-label="Language">
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => changeLanguage(l.code)}
          className={`rounded-lg px-3 py-1 text-sm font-semibold ${
            i18n.language === l.code ? 'bg-white text-brand-700 shadow' : 'text-gray-600'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
