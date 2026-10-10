import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { api } from '../api'

/**
 * Load a farm-scoped endpoint (weather, irrigation, …) for the farmer or the helper's selected farmer.
 * Returns { data, error, errorStatus, loading, reload }. errorStatus 409 = farm location missing.
 */
export function useFarmData(path) {
  const { user, actingFor, farmerParam } = useAuth()
  const [state, setState] = useState({ data: null, error: '', errorStatus: null, loading: true })
  const blocked = user.role === 'helper' && !actingFor

  const reload = useCallback(() => {
    if (blocked) return setState({ data: null, error: '', errorStatus: null, loading: false })
    setState((s) => ({ ...s, loading: true }))
    api(path, { params: farmerParam })
      .then((data) => setState({ data, error: '', errorStatus: null, loading: false }))
      .catch((e) => setState({ data: null, error: e.message, errorStatus: e.status, loading: false }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, actingFor?.user_id, blocked])

  useEffect(() => { reload() }, [reload])
  return { ...state, blocked, reload }
}
