import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import { useTranslation } from 'react-i18next'
import '../components/LocationPicker.jsx' // registers default Leaflet marker icons
import { diseaseInfo } from './DiseaseResult.jsx'

export const LEVEL_COLOR = { watch: '#eab308', warning: '#f97316', outbreak: '#dc2626' }

// Anonymous case points (1 km grid) + outbreak circles around the farm.
export default function RadarMap({ data, height = 360 }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language === 'hi' ? 'hi' : 'en'
  const { center, points, outbreaks } = data
  return (
    <MapContainer center={[center.lat, center.lon]} zoom={11} style={{ height }} className="rounded-xl">
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[center.lat, center.lon]}>
        <Popup>{t('radar.myFarm')}</Popup>
      </Marker>
      {outbreaks.map((o) => (
        <Circle
          key={o.id}
          center={[o.center_lat, o.center_lon]}
          radius={(o.radius_km + 1) * 1000}
          pathOptions={{ color: LEVEL_COLOR[o.level], fillColor: LEVEL_COLOR[o.level], fillOpacity: 0.15, weight: 2 }}
        >
          <Popup>
            <b>{diseaseInfo(o.disease, lang)?.name}</b>
            <br />
            {t(`radar.level.${o.level}`)} · {t('radar.farms', { count: o.farm_count })}
            {o.is_demo && <><br />🧪 {t('radar.demoData')}</>}
          </Popup>
        </Circle>
      ))}
      {points.map((p, i) => (
        <CircleMarker key={i} center={[p.lat, p.lon]} radius={7}
          pathOptions={{ color: '#7f1d1d', fillColor: '#ef4444', fillOpacity: 0.8, weight: 1 }}>
          <Popup>
            {diseaseInfo(p.disease, lang)?.name}
            {p.is_demo && <><br />🧪 {t('radar.demoData')}</>}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}
