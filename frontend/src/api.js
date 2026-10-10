// Small fetch wrapper for the FarmGuard API (proxied to FastAPI by Vite in dev).
const TOKEN_KEY = 'farmguard_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY))

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

const MSG = {
  // backend (port 8000) down, frontend still running → Vite proxy returns an empty 5xx
  backend: {
    en: 'The FarmGuard server is not running (backend window closed). Start it again with start.bat — your data is safe.',
    hi: 'फार्मगार्ड सर्वर बंद है (बैकएंड विंडो बंद हो गई)। start.bat से फिर चालू करें — आपका डेटा सुरक्षित है।',
  },
  // fetch failed although the device has internet → the app server itself (frontend window) is closed
  app: {
    en: 'Cannot reach the FarmGuard app server. Both FarmGuard windows must stay open — run start.bat again, then reload this page.',
    hi: 'फार्मगार्ड ऐप सर्वर से संपर्क नहीं हो पा रहा। दोनों फार्मगार्ड विंडो खुली रहनी चाहिए — start.bat फिर चलाएं, फिर यह पेज रीलोड करें।',
  },
  // device really has no internet
  offline: { en: 'You are offline. Connect to the internet and try again.', hi: 'आप ऑफ़लाइन हैं। इंटरनेट से जुड़कर फिर कोशिश करें।' },
}

const lang = () => (localStorage.getItem('farmguard_lang') === 'en' ? 'en' : 'hi')

/** Vite's dev proxy answers 500/502/503/504 with an EMPTY body when the backend is down. FastAPI always sends JSON. */
function serverDown(res, data) {
  return [500, 502, 503, 504].includes(res.status) && data == null
}

function downError() {
  return new ApiError(MSG.backend[lang()], 503)
}

/** fetch() itself failed: distinguish "phone has no internet" from "app server closed". */
function networkError() {
  return navigator.onLine ? new ApiError(MSG.app[lang()], 0) : new ApiError(MSG.offline[lang()], 0)
}

/** Login no longer valid (expired, or database was reset) → clear it and go to the login page. */
function handleUnauthorized(path) {
  if (getToken() && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
    setToken(null)
    if (window.location.pathname !== '/login') window.location.assign('/login')
  }
}

/** multipart upload (e.g. Soil Health Card photo). */
export async function apiUpload(path, formData) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let res
  try {
    res = await fetch(`/api${path}`, { method: 'POST', headers, body: formData })
  } catch {
    throw networkError()
  }
  const data = await res.json().catch(() => null)
  if (serverDown(res, data)) throw downError()
  if (res.status === 401) handleUnauthorized(path)
  if (!res.ok) throw new ApiError(data?.detail || res.statusText, res.status)
  return data
}

export async function api(path, { method = 'GET', body, params } = {}) {
  const url = new URL(`/api${path}`, window.location.origin)
  Object.entries(params || {}).forEach(([k, v]) => v !== undefined && v !== null && url.searchParams.set(k, v))

  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw networkError()
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (serverDown(res, data)) throw downError()
  if (res.status === 401) handleUnauthorized(path)
  if (!res.ok) {
    const detail = data?.detail
    const msg = Array.isArray(detail) ? detail.map((d) => d.msg).join(', ') : detail || res.statusText
    throw new ApiError(msg, res.status)
  }
  return data
}
