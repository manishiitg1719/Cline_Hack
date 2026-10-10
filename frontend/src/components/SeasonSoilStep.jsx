import { useTranslation } from 'react-i18next'
import ChipGroup from './ChipGroup.jsx'
import { SOILS } from '../lib/options'

const SEASONS = ['kharif', 'rabi', 'zaid']
const SOIL_ICON = { alluvial: '🟫', black: '⬛', red: '🟥', laterite: '🟧', sandy: '🟨', clay: '🟤', loamy: '🌰' }

// Wizard step 1: season + picture-style soil type picker ("Not sure" → SoilGrids estimate).
export default function SeasonSoilStep({ form, set }) {
  const { t } = useTranslation()
  return (
    <>
      <span className="label">{t('crop.seasonLabel')}</span>
      <ChipGroup options={SEASONS} value={form.season} onChange={set('season')} labelOf={(s) => t(`crop.season.${s}`)} />
      <span className="label">{t('farm.soil')}</span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SOILS.map((s) => (
          <button key={s || 'unknown'} type="button" onClick={() => set('soil_type')(s)}
            className={`rounded-xl border-2 p-2 text-sm ${form.soil_type === s ? 'border-brand-600 bg-brand-50 font-semibold' : 'border-gray-200'}`}>
            <div className="text-2xl">{SOIL_ICON[s] || '❓'}</div>
            <div>{t(`soil.${s}`)}</div>
            {s && <div className="text-[10px] text-gray-500">{t(`crop.soilDesc.${s}`)}</div>}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">{t('crop.soilAuto')}</p>
    </>
  )
}
