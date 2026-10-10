// Logs in as the demo farmer (seed_demo.py) and opens every page in headless Edge.
// Fails if a page shows an error boundary / blank page or throws a JS exception.
// Usage: backend + `npm run dev` running, then: node scripts/page-tour.mjs
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const BASE = process.env.SELFTEST_URL || 'http://localhost:5173'
const browser = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const port = 9335
const PAGES = ['/', '/farm', '/scan', '/crop', '/irrigation', '/weather', '/radar', '/satellite', '/assistant', '/messages', '/family', '/market', '/schemes', '/status', '/more']
const proc = spawn(browser, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(path.join(tmpdir(), 'fg-tour-'))}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const res = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '9999900001', password: 'demo1234' }) })
  const { token } = await res.json()
  let target
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250)
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page') } catch { /* starting */ }
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  const errors = []
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.split('\n')[0] || m.params.exceptionDetails.text)
  })
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const text = async () => (await send('Runtime.evaluate', { expression: "document.querySelector('main')?.innerText || ''", returnByValue: true }))?.result?.value || ''

  await send('Runtime.enable')
  await send('Page.navigate', { url: `${BASE}/login` })
  await sleep(1500)
  await send('Runtime.evaluate', { expression: `localStorage.setItem('farmguard_token', ${JSON.stringify(token)}); localStorage.setItem('farmguard_lang','hi')` })
  let failed = 0
  for (const p of PAGES) {
    const before = errors.length
    await send('Page.navigate', { url: `${BASE}${p}` })
    let t = ''
    for (let i = 0; i < 24; i++) {
      await sleep(500)
      t = await text()
      if (t.length > 40 && !/लोड हो रहा है…$/.test(t.trim())) break
    }
    const ok = t.length > 40 && errors.length === before
    failed += ok ? 0 : 1
    console.log(`${ok ? 'PASS' : 'FAIL'} ${p.padEnd(12)} ${t.replace(/\s+/g, ' ').slice(0, 70)}${errors.length > before ? '  ERR: ' + errors.slice(before).join(' | ') : ''}`)
  }
  console.log(failed ? `${failed} page(s) failed` : `ALL ${PAGES.length} PAGES OK`)
  return failed ? 1 : 0
}

main().then((c) => { proc.kill(); process.exit(c) }).catch((e) => { console.error(e); proc.kill(); process.exit(1) })
