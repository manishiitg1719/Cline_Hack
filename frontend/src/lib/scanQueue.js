// Offline queue for scan results. Results are saved on the phone first, then synced when online.
// localStorage is enough here: each entry is ~200 bytes (no images are stored or uploaded).
import { api } from '../api'

const KEY = 'farmguard_scan_queue'
const HISTORY_KEY = 'farmguard_scan_history'

const read = (k) => {
  try {
    return JSON.parse(localStorage.getItem(k) || '[]')
  } catch {
    return []
  }
}
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v))

export const newClientId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

/** Save locally (history always; queue only for confident results that are worth syncing). */
export function saveScan(entry, { syncable }) {
  const history = [entry, ...read(HISTORY_KEY)].slice(0, 50)
  write(HISTORY_KEY, history)
  if (syncable) write(KEY, [...read(KEY), entry])
}

export const pendingScans = () => read(KEY)
export const localHistory = () => read(HISTORY_KEY)

/** Push queued scans; keeps them in the queue if offline. Returns number saved. */
export async function syncScans(farmerParam = {}) {
  const queue = read(KEY)
  if (!queue.length) return 0
  const payload = queue.map(({ client_id, crop, disease, confidence, scanned_at, shared }) => ({
    client_id, crop, disease, confidence, scanned_at, shared,
  }))
  const res = await api('/scans/sync', { method: 'POST', body: { scans: payload }, params: farmerParam })
  // server accepted (saved or already had them) → clear those from the queue
  const sent = new Set(payload.map((p) => p.client_id))
  write(KEY, read(KEY).filter((e) => !sent.has(e.client_id)))
  return res.saved
}
