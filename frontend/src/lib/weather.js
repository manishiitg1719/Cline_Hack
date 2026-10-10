// WMO weather codes (Open-Meteo) → icon + i18n key
export function weatherIcon(code) {
  if (code === 0) return '☀️'
  if ([1, 2].includes(code)) return '🌤️'
  if (code === 3) return '☁️'
  if ([45, 48].includes(code)) return '🌫️'
  if (code >= 51 && code <= 57) return '🌦️'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return '🌧️'
  if ((code >= 71 && code <= 77) || [85, 86].includes(code)) return '❄️'
  if (code >= 95) return '⛈️'
  return '🌡️'
}

export function weatherKey(code) {
  if (code === 0) return 'clear'
  if ([1, 2].includes(code)) return 'partly'
  if (code === 3) return 'cloudy'
  if ([45, 48].includes(code)) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || [85, 86].includes(code)) return 'snow'
  if (code >= 95) return 'storm'
  return 'unknown'
}

export const DECISION_STYLE = {
  irrigate: { icon: '💧', cls: 'bg-blue-600 text-white' },
  delay: { icon: '⏳', cls: 'bg-amber-500 text-white' },
  monitor: { icon: '👀', cls: 'bg-green-600 text-white' },
}

export function formatDay(dateStr, lang) {
  return new Date(`${dateStr}T00:00`).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
