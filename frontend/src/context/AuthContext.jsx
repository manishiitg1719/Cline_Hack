import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import i18n from '../i18n'
import { api, getToken, setToken } from '../api'

const AuthContext = createContext(null)
const ACTING_KEY = 'farmguard_acting_for'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))
  // Set when we have a saved login but the server could not be reached to confirm it.
  const [connError, setConnError] = useState('')
  // For helpers: which linked farmer they are currently acting for
  const [actingFor, setActingForState] = useState(() => {
    const raw = localStorage.getItem(ACTING_KEY)
    return raw ? JSON.parse(raw) : null
  })

  const applyUser = useCallback((u) => {
    setUser(u)
    if (u?.language) i18n.changeLanguage(u.language)
  }, [])

  const loadMe = useCallback(() => {
    if (!getToken()) return setLoading(false)
    setLoading(true)
    api('/auth/me')
      .then((u) => { setConnError(''); applyUser(u) })
      // Only forget the login if the server REJECTED it (401). If the server is just unreachable,
      // keep the token and show "server is off" + Retry instead of throwing the user to the login page.
      .catch((e) => {
        if (e.status === 401) setToken(null)
        else setConnError(e.message)
      })
      .finally(() => setLoading(false))
  }, [applyUser])

  useEffect(() => { loadMe() }, [loadMe])

  const login = async (phone, password) => {
    const res = await api('/auth/login', { method: 'POST', body: { phone, password } })
    setToken(res.token)
    applyUser(res.user)
    return res.user
  }

  const register = async (payload) => {
    const res = await api('/auth/register', { method: 'POST', body: payload })
    setToken(res.token)
    applyUser(res.user)
    return res.user
  }

  const logout = () => {
    setToken(null)
    localStorage.removeItem(ACTING_KEY)
    setActingForState(null)
    setUser(null)
  }

  const changeLanguage = async (language) => {
    i18n.changeLanguage(language)
    if (user) applyUser(await api('/auth/me/language', { method: 'PATCH', body: { language } }))
  }

  const setActingFor = (farmer) => {
    setActingForState(farmer)
    farmer ? localStorage.setItem(ACTING_KEY, JSON.stringify(farmer)) : localStorage.removeItem(ACTING_KEY)
  }

  // farmer_id query param for farm-scoped API calls
  const farmerParam = user?.role === 'helper' ? { farmer_id: actingFor?.user_id } : {}

  return (
    <AuthContext.Provider
      value={{ user, setUser: applyUser, loading, login, register, logout, changeLanguage, actingFor, setActingFor, farmerParam, connError, retry: loadMe }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
