// Tiny dependency-free SVG line chart for the NDVI timeline (0 … 1).
const W = 320
const H = 140
const PAD = { l: 30, r: 10, t: 10, b: 24 }

export default function NdviChart({ series, lang = 'en' }) {
  if (!series?.length) return null
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const x = (i) => PAD.l + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW)
  const y = (v) => PAD.t + (1 - Math.max(0, Math.min(1, v))) * innerH
  const path = series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.ndvi).toFixed(1)}`).join(' ')
  const fmt = (d) => new Date(`${d}T00:00`).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { month: 'short' })
  const bands = [
    { from: 0.6, to: 1, cls: 'fill-green-100' },
    { from: 0.4, to: 0.6, cls: 'fill-lime-50' },
    { from: 0.2, to: 0.4, cls: 'fill-amber-50' },
    { from: 0, to: 0.2, cls: 'fill-stone-100' },
  ]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="NDVI chart">
      {bands.map((b) => (
        <rect key={b.from} x={PAD.l} width={innerW} y={y(b.to)} height={y(b.from) - y(b.to)} className={b.cls} />
      ))}
      {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
        <text key={v} x={PAD.l - 4} y={y(v) + 3} textAnchor="end" className="fill-gray-400 text-[8px]">{v}</text>
      ))}
      <path d={path} fill="none" stroke="#15803d" strokeWidth="2.5" strokeLinejoin="round" />
      {series.map((p, i) => (
        <g key={p.date}>
          <circle cx={x(i)} cy={y(p.ndvi)} r="3.5" className="fill-brand-700" />
          <text x={x(i)} y={H - 8} textAnchor="middle" className="fill-gray-500 text-[8px]">{fmt(p.date)}</text>
        </g>
      ))}
    </svg>
  )
}
