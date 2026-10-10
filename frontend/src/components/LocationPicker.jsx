import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { useEffect } from 'react'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix default marker icons when bundled by Vite
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

const INDIA_CENTER = [22.5, 79]

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
    if (position) map.setView(position, Math.max(map.getZoom(), 13))
  }, [position?.[0], position?.[1]]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function LocationPicker({ lat, lon, onPick, disabled = false, height = 280 }) {
  const position = lat != null && lon != null ? [lat, lon] : null
  return (
    <MapContainer center={position || INDIA_CENTER} zoom={position ? 13 : 4} style={{ height }} className="rounded-xl">
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler onPick={onPick} disabled={disabled} />
      <Recenter position={position} />
      {position && <Marker position={position} />}
    </MapContainer>
  )
}
