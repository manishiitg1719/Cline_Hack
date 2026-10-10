/* FarmGuard service worker (generated into dist/sw.js at build time).
 * - Pre-caches the app shell (HTML, JS, CSS, icons, locales) → the app OPENS without internet.
 * - Navigation requests: network first, fall back to cached index.html (SPA routes work offline).
 * - Static assets: cache first. API calls (/api/*): always network (the app shows FALLBACK data itself).
 * - The disease model/wasm are cached separately by src/lib/diseaseModel.js (cache "farmguard-model-v1").
 */
const VERSION = '__VERSION__'
const SHELL = `farmguard-shell-${VERSION}`
const PRECACHE = __PRECACHE__

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('farmguard-shell-') && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html', { cacheName: SHELL })),
    )
    return
  }
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'))) {
        const copy = res.clone()
        caches.open(SHELL).then((c) => c.put(req, copy))
      }
      return res
    })),
  )
})
