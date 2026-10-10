// Saves screenshots of a page in headless Edge (visual check).
// Usage: node scripts/screenshot.mjs <path> <out.png> [width] [height] [lang] [login]
//   login = "1" → logs in as the demo farmer first (backend + seed_demo.py needed)
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const [route = '/login', out = 'shot.png', w = '1440', h = '900', lang = 'en', login = '0'] = process.argv.slice(2)
const BASE = process.env.SELFTEST_URL || 'http://localhost:5173'
const port = 9337
const proc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(path.join(tmpdir(), 'fg-shot-'))}`, 'about:blank'], { stdio: 'ignore' })
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
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })

  const mobile = Number(w) < 768
  await send('Emulation.setDeviceMetricsOverride', { width: Number(w), height: Number(h), deviceScaleFactor: 1, mobile })
  await send('Page.navigate', { url: `${BASE}/login` })
  await sleep(1500)
  let token = ''
  if (login === '1') {
    const res = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: '9999900001', password: 'demo1234' }) })
    token = (await res.json()).token
  }
  await send('Runtime.evaluate', { expression: `localStorage.setItem('farmguard_lang', '${lang}'); ${token ? `localStorage.setItem('farmguard_token', ${JSON.stringify(token)})` : "localStorage.removeItem('farmguard_token')"}` })
  await send('Page.navigate', { url: `${BASE}${route}` })
  await sleep(4000)
  const jpeg = out.toLowerCase().endsWith('.jpg')
  const shot = await send('Page.captureScreenshot', jpeg ? { format: 'jpeg', quality: 70 } : { format: 'png' })
  writeFileSync(out, Buffer.from(shot.data, 'base64'))
  console.log('saved', out)
}
main().then(() => { proc.kill(); process.exit(0) }).catch((e) => { console.error(e); proc.kill(); process.exit(1) })
