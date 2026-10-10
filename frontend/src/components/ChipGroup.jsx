// Row of tappable chips. `multi` toggles values in an array; otherwise single select.
export default function ChipGroup({ options, value, onChange, labelOf, multi = false, rounded = 'rounded-xl' }) {
  const isOn = (o) => (multi ? value.includes(o) : value === o)
  const toggle = (o) => {
    if (!multi) return onChange(o)
    onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => toggle(o)}
          className={`${rounded} border px-3 py-1.5 text-sm ${
            isOn(o) ? 'border-brand-600 bg-brand-600 font-semibold text-white' : 'border-gray-300 bg-white'
          }`}
        >
          {labelOf(o)}
        </button>
      ))}
    </div>
  )
}
