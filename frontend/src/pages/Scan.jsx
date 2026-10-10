import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext.jsx'
import ModeBadge from '../components/ModeBadge.jsx'
import DiseaseResult from '../components/DiseaseResult.jsx'
import { ExamplePhotos, ScanHistory } from '../components/ScanExtras.jsx'
import { isModelCached, loadModel, scanImage } from '../lib/diseaseModel'
import { localHistory, newClientId, pendingScans, saveScan, syncScans } from '../lib/scanQueue'

export default function Scan() {
  const { t } = useTranslation()
  const { user, actingFor, farmerParam } = useAuth()
  const [modelState, setModelState] = useState('loading') // loading | ready | error
  const [cached, setCached] = useState(false)
  const [preview, setPreview] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(pendingScans().length)
  const [history, setHistory] = useState(localHistory())
  const [online, setOnline] = useState(navigator.onLine)
  const fileRef = useRef(null)
  const cameraRef = useRef(null)
  const blockedHelper = user.role === 'helper' && !actingFor
  const ready = modelState === 'ready' && !busy

  useEffect(() => {
    loadModel()
      .then(() => { setModelState('ready'); return isModelCached() })
      .then(setCached)
      .catch((e) => { setModelState('error'); setError(e.message) })
  }, [])

  const trySync = async () => {
    if (!navigator.onLine || blockedHelper) return
    try {
      await syncScans(farmerParam)
    } catch {
      /* stays queued until next time */
    }
    setPending(pendingScans().length)
  }

  useEffect(() => {
    const on = () => { setOnline(true); trySync() }
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    trySync()
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [actingFor?.user_id]) // eslint-disable-line react-hooks/exhaustive-deps

  const record = (r) => {
    if (r.status === 'rejected') return // not a leaf → not stored at all
    const entry = {
      client_id: newClientId(), crop: r.crop, disease: r.label, confidence: Number(r.confidence.toFixed(4)),
      status: r.status, scanned_at: new Date().toISOString(), shared: true,
    }
    // only confident results are synced (they feed the Village Disease Radar)
    saveScan(entry, { syncable: (r.status === 'disease' || r.status === 'healthy') && !blockedHelper })
    setHistory(localHistory())
    setPending(pendingScans().length)
    trySync()
  }

  const runOn = (src) => {
    setError('')
    setResult(null)
    setPreview(src)
    const img = new Image()
    img.onload = async () => {
      setBusy(true)
      try {
        const r = await scanImage(img)
        setResult(r)
        record(r)
      } catch (e) {
        setError(e.message)
      } finally {
        setBusy(false)
      }
    }
    img.onerror = () => setError(t('scan.badImage'))
    img.src = src
  }

  const onFile = (e) => {
    const f = e.target.files?.[0]
    if (f) runOn(URL.createObjectURL(f))
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">🦠 {t('nav.scan')}</h1>
        <ModeBadge mode="fallback" source={t('scan.onDevice')} />
      </div>

      <div className="card text-sm">
        {modelState === 'loading' && <span>⏳ {t('scan.modelLoading')}</span>}
        {modelState === 'ready' && <span className="text-green-700">✅ {cached ? t('scan.modelOffline') : t('scan.modelReady')}</span>}
        {modelState === 'error' && <span className="text-red-700">❌ {t('scan.modelError')} {error}</span>}
        <div className="mt-1 text-xs text-gray-500">
          {online ? '🌐' : '📴'} {pending > 0 ? t('scan.pending', { count: pending }) : t('scan.allSynced')}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button className="btn-primary py-4 text-lg" disabled={!ready} onClick={() => cameraRef.current?.click()}>📷 {t('scan.takePhoto')}</button>
        <button className="btn-outline py-4 text-lg" disabled={!ready} onClick={() => fileRef.current?.click()}>🖼️ {t('scan.gallery')}</button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
      <p className="text-xs text-gray-500">💡 {t('scan.photoTips')}</p>

      {preview && (
        <div className="card flex justify-center">
          <img src={preview} alt="" className="max-h-64 rounded-xl object-contain" />
        </div>
      )}
      {busy && <div className="card text-center">🔍 {t('scan.scanning')}</div>}
      {error && modelState === 'ready' && <div className="card border-l-4 border-red-400 text-red-700">{error}</div>}
      {result && !busy && <DiseaseResult result={result} />}

      <ExamplePhotos disabled={!ready} onPick={runOn} />
      <ScanHistory history={history} />
      <p className="text-[11px] text-gray-400">{t('scan.attribution')}</p>
    </div>
  )
}
