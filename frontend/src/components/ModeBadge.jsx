// LIVE / FALLBACK badge shown on every result that comes from a provider.
export default function ModeBadge({ mode, source }) {
  const live = mode === 'live'
  return (
    <span
      title={source}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
        live ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${live ? 'bg-green-500' : 'bg-orange-500'}`} />
      {live ? 'LIVE' : 'FALLBACK'}
      {source && <span className="font-normal opacity-80">· {source}</span>}
    </span>
  )
}
