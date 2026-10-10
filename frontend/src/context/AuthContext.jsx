import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import i18n from '../i18n'
import { api, getToken, setToken } from '../api'

const AuthContext = createContext(null)
const ACTING_KEY = 'farmguard_acting_for'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))
  // For helpers: which linked farmer they are currently acting for
  const [actingFor, setActingForState] = useState(() => {
    const raw = localStorage.getItem(ACTING_KEY)
    return raw ? JSON.parse(raw) : null
  })

  const applyUser = useCallback((u) => {
    setUser(u)
    if (u?.language) i18n.changeLanguage(u.language)
  }, [])

  useEffect(() => {
    if (!getToken()) return
    api('/auth/me')
      .then(applyUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [applyUser])

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
      value={{ user, setUser: applyUser, loading, login, register, logout, changeLanguage, actingFor, setActingFor, farmerParam }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
