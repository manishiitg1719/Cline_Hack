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

export const SERVER_DOWN = 'server_down'
const SERVER_DOWN_MSG = {
  en: 'Cannot reach the FarmGuard server. Is the backend running? Start it with start.bat (or: cd backend → python -m uvicorn app.main:app --port 8000).',
  hi: 'फार्मगार्ड सर्वर से संपर्क नहीं हो पा रहा। क्या बैकएंड चालू है? start.bat से चालू करें (या: cd backend → python -m uvicorn app.main:app --port 8000)।',
}

/** Vite's dev proxy answers 500/502/503/504 with an EMPTY body when the backend is down. FastAPI always sends JSON. */
function serverDown(res, data) {
  return [500, 502, 503, 504].includes(res.status) && data == null
}

function downError() {
  const lang = localStorage.getItem('farmguard_lang') === 'en' ? 'en' : 'hi'
  return new ApiError(SERVER_DOWN_MSG[lang], 503)
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
    throw new ApiError('offline', 0)
  }
  const data = await res.json().catch(() => null)
  if (serverDown(res, data)) throw downError()
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
    throw new ApiError('offline', 0)
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (serverDown(res, data)) throw downError()
  if (!res.ok) {
    const detail = data?.detail
    const msg = Array.isArray(detail) ? detail.map((d) => d.msg).join(', ') : detail || res.statusText
    throw new ApiError(msg, res.status)
  }
  return data
}
