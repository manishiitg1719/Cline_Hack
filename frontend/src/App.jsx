import { Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from './context/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import FarmProfile from './pages/FarmProfile.jsx'
import SystemStatus from './pages/SystemStatus.jsx'
import Messages from './pages/Messages.jsx'
import Family from './pages/Family.jsx'

function Protected({ children }) {
  const { user, loading } = useAuth()
  const { t } = useTranslation()
  if (loading) return <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="farm" element={<FarmProfile />} />
        <Route path="status" element={<SystemStatus />} />
        <Route path="messages" element={<Messages />} />
        <Route path="family" element={<Family />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
