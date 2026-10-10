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
import Weather from './pages/Weather.jsx'
import Irrigation from './pages/Irrigation.jsx'
import { lazy, Suspense } from 'react'

// Heavy page (ONNX runtime) → separate chunk, loaded only when opened
const Scan = lazy(() => import('./pages/Scan.jsx'))
const Radar = lazy(() => import('./pages/Radar.jsx'))
const CropAdvisor = lazy(() => import('./pages/CropAdvisor.jsx'))
const FieldHealth = lazy(() => import('./pages/FieldHealth.jsx'))
const Assistant = lazy(() => import('./pages/Assistant.jsx'))
const Schemes = lazy(() => import('./pages/Schemes.jsx'))
const Market = lazy(() => import('./pages/Market.jsx'))
const More = lazy(() => import('./components/FeatureGrid.jsx').then((m) => ({ default: m.MorePage })))

function Loading() {
  const { t } = useTranslation()
  return <div className="p-8 text-center text-gray-500">{t('common.loading')}</div>
}

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
        <Route path="weather" element={<Weather />} />
        <Route path="irrigation" element={<Irrigation />} />
        <Route path="scan" element={<Suspense fallback={<Loading />}><Scan /></Suspense>} />
        <Route path="radar" element={<Suspense fallback={<Loading />}><Radar /></Suspense>} />
        <Route path="crop" element={<Suspense fallback={<Loading />}><CropAdvisor /></Suspense>} />
        <Route path="satellite" element={<Suspense fallback={<Loading />}><FieldHealth /></Suspense>} />
        <Route path="assistant" element={<Suspense fallback={<Loading />}><Assistant /></Suspense>} />
        <Route path="schemes" element={<Suspense fallback={<Loading />}><Schemes /></Suspense>} />
        <Route path="market" element={<Suspense fallback={<Loading />}><Market /></Suspense>} />
        <Route path="more" element={<Suspense fallback={<Loading />}><More /></Suspense>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
