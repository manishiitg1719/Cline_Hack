import { useTranslation } from 'react-i18next'
import { CROP_KEYS, useMessageStrings } from '../lib/options'

// One fill-in blank of a template. Dropdowns where possible → almost no typing.
export default function ParamInput({ name, type, value, onChange }) {
  const { t } = useTranslation()
  const strings = useMessageStrings()
  const id = `param-${name}`
  const label = <label className="label" htmlFor={id}>{t(`msg.param.${name}`, name)}</label>

  const select = (keys, dict) => (
    <select id={id} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {keys.map((k) => <option key={k} value={k}>{dict[k]}</option>)}
    </select>
  )

  let control
  if (type === 'crop') control = select(CROP_KEYS, strings.crops)
  else if (type === 'item') control = select(Object.keys(strings.items), strings.items)
  else if (type === 'issue') control = select(Object.keys(strings.issues), strings.issues)
  else if (type === 'number')
    control = <input id={id} type="number" min="0" className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
  else if (type === 'date')
    control = <input id={id} type="date" className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
  else
    control = (
      <textarea id={id} rows={3} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={t('msg.typeHere')} />
    )

  return (
    <div>
      {label}
      {control}
    </div>
  )
}
