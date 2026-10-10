import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api'
import { catalog, renderMessage, templateTitle } from '../lib/messages'
import ParamInput from '../components/ParamInput.jsx'
import ShareButtons from '../components/ShareButtons.jsx'
import Contacts from '../components/Contacts.jsx'

const today = () => new Date().toISOString().slice(0, 10)

export default function Messages() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [selected, setSelected] = useState(null)
  const [params, setParams] = useState({})
  const [contacts, setContacts] = useState([])
  const [contactId, setContactId] = useState('')
  const [msgLang, setMsgLang] = useState(user.language || 'hi')
  const [text, setText] = useState('')
  const [edited, setEdited] = useState(false)

  const loadContacts = () => api('/contacts').then(setContacts).catch(() => {})
  useEffect(() => { loadContacts() }, [])

  const contact = contacts.find((c) => String(c.id) === String(contactId))
  // Message goes out in the recipient's language when a contact is chosen (language bridge)
  useEffect(() => { if (contact) setMsgLang(contact.language) }, [contact?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const meta = useMemo(() => catalog.quick.find((q) => q.id === selected), [selected])

  useEffect(() => {
    if (!meta || edited) return
    setText(renderMessage(meta.id, params, msgLang))
  }, [meta, params, msgLang, edited])

  const pick = (id) => {
    const m = catalog.quick.find((q) => q.id === id)
    const defaults = {}
    Object.entries(m.params).forEach(([k, type]) => {
      if (type === 'date') defaults[k] = today()
    })
    setSelected(id)
    setParams(defaults)
    setEdited(false)
  }

  const uiLang = i18n.language === 'hi' ? 'hi' : 'en'

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">📨 {t('msg.title')}</h1>
      <p className="text-sm text-gray-600">{t('msg.intro')}</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {catalog.quick.map((q) => (
          <button
            key={q.id}
            onClick={() => pick(q.id)}
            className={`card text-left transition ${selected === q.id ? 'ring-2 ring-brand-600' : 'hover:ring-brand-500'}`}
          >
            <div className="text-2xl">{q.icon}</div>
            <div className="text-sm font-semibold">{templateTitle(q.id, uiLang)}</div>
          </button>
        ))}
      </div>

      {meta && (
        <div className="card space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="to">{t('msg.sendTo')}</label>
              <select id="to" className="input" value={contactId} onChange={(e) => setContactId(e.target.value)}>
                <option value="">{t('msg.chooseInWhatsApp')}</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {t(`contacts.cat.${c.category}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <span className="label">{t('msg.messageLanguage')}</span>
              <div className="flex gap-2">
                {['hi', 'en'].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => { setMsgLang(l); setEdited(false) }}
                    className={`btn flex-1 border ${msgLang === l ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-gray-300'}`}
                  >
                    {l === 'hi' ? 'हिंदी' : 'English'}
                  </button>
                ))}
              </div>
            </div>
            {Object.entries(meta.params).map(([name, type]) => (
              <ParamInput
                key={name}
                name={name}
                type={type}
                value={params[name]}
                onChange={(v) => { setParams((p) => ({ ...p, [name]: v })); setEdited(false) }}
              />
            ))}
          </div>

          <div>
            <label className="label" htmlFor="preview">{t('msg.preview')}</label>
            <textarea
              id="preview"
              rows={3}
              className="input bg-green-50 text-base"
              value={text}
              onChange={(e) => { setText(e.target.value); setEdited(true) }}
            />
            <p className="mt-1 text-xs text-gray-500">{t('msg.tapSendHint')}</p>
          </div>
          <ShareButtons text={text} phone={contact?.phone} />
        </div>
      )}

      <Contacts contacts={contacts} onChange={loadContacts} />
    </div>
  )
}
