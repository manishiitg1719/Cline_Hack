import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix default marker icons when bundled by Vite
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

const INDIA_CENTER = [22.5, 79]
const LAYERS = {
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Imagery &copy; Esri', maxZoom: 18 },
  map: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 },
}
function readLayer() {
  try { return localStorage.getItem('farmguard_map_layer') === 'map' ? 'map' : 'satellite' } catch { return 'satellite' }
}

function ClickHandler({ onPick, disabled }) {
  useMapEvents({
    click(e) {
      if (!disabled) onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)))
    },
  })
  return null
}

function Recenter({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 16))
  }, [position?.[0], position?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function LocationPicker({ lat, lon, onPick, disabled = false, height = 280 }) {
  const { t } = useTranslation()
  const [layer, setLayer] = useState(readLayer)
  const position = lat != null && lon != null ? [lat, lon] : null
  const choose = (l) => {
    setLayer(l)
    try { localStorage.setItem('farmguard_map_layer', l) } catch { /* ignore */ }
  }
  const tiles = LAYERS[layer]
  return (
    <div className="relative">
      <MapContainer center={position || INDIA_CENTER} zoom={position ? 16 : 4} maxZoom={tiles.maxZoom} style={{ height }} className="rounded-xl">
        <TileLayer key={layer} attribution={tiles.attribution} url={tiles.url} maxZoom={tiles.maxZoom} />
        <ClickHandler onPick={onPick} disabled={disabled} />
        <Recenter position={position} />
        {position && <Circle center={position} radius={165} pathOptions={{ color: '#facc15', weight: 3, fillOpacity: 0.06 }} />}
        {position && <Marker position={position} />}
      </MapContainer>
      <div className="absolute right-2 top-2 z-[500] inline-flex rounded-full bg-white/95 p-1 shadow-md ring-1 ring-cream-200" role="group">
        {['satellite', 'map'].map((l) => (
          <button key={l} type="button" onClick={() => choose(l)}
            className={`rounded-full px-3 py-1 text-xs font-bold ${layer === l ? 'bg-forest-900 text-cream-50' : 'text-forest-900'}`}>
            {l === 'satellite' ? '🛰️ ' + t('farm.satellite') : '🗺️ ' + t('farm.mapView')}
          </button>
        ))}
      </div>
    </div>
  )
}
