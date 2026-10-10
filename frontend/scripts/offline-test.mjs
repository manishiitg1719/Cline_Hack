// PWA offline test: open the production build online (service worker installs + caches shell),
// then emulate NO NETWORK, reload, and check the app still renders. Also checks the manifest.
// Usage: npm run build && npx vite preview --port 4173 (in another terminal) && node scripts/offline-test.mjs
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const browser = process.argv[2] || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const BASE = process.env.SELFTEST_URL || 'http://localhost:4173'
const port = 9334
const profile = mkdtempSync(path.join(tmpdir(), 'fg-pwa-'))
const proc = spawn(browser, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  let target
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250)
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page') } catch { /* starting */ }
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
  })
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }))?.result?.value

  await send('Runtime.enable')
  await send('Network.enable')
  await send('Page.navigate', { url: `${BASE}/login` })
  let swReady = false
  for (let i = 0; i < 40 && !swReady; i++) {
    await sleep(500)
    swReady = await evaluate("navigator.serviceWorker.getRegistration().then(r => !!(r && r.active))")
  }
  const manifest = await evaluate("fetch('/manifest.webmanifest').then(r => r.json()).then(m => m.name + '|' + m.display + '|' + m.icons.length)")
  const cached = await evaluate("caches.keys().then(k => k.join(','))")
  console.log('online  : service worker active =', swReady, '| manifest =', manifest, '| caches =', cached)

  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await send('Page.reload', { ignoreCache: false })
  let text = ''
  for (let i = 0; i < 20 && !text.includes('FarmGuard') && !text.includes('फार्मगार्ड'); i++) {
    await sleep(500)
    text = (await evaluate('document.body.innerText')) || ''
  }
  const ok = swReady && (text.includes('FarmGuard') || text.includes('फार्मगार्ड'))
  console.log('offline : page text starts with ->', JSON.stringify(text.slice(0, 80)))
  console.log(ok ? 'PASS: app opens with NO network' : 'FAIL')
  return ok ? 0 : 1
}

main().then((c) => { proc.kill(); process.exit(c) }).catch((e) => { console.error(e); proc.kill(); process.exit(1) })
