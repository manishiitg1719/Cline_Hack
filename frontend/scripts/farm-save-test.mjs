// Reproduces the "offline on Save" report: register → My Farm → fill → Save, then kill the backend and check the banner.
// Usage: node scripts/farm-save-test.mjs <step>   step = save | banner
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const step = process.argv[2] || 'save'
const port = 9337
const proc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(path.join(tmpdir(), 'fg-farm-'))}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  let target
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250)
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page') } catch { /* */ }
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  const ev = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }))?.result?.value

  // log in as a fresh farmer through the API (banner step: backend is already down → use a dummy token)
  let reg = { token: 'dummy-token-backend-down' }
  if (step === 'save') {
    const phone = '9' + Math.floor(1e8 + Math.random() * 9e8)
    reg = await (await fetch('http://localhost:5173/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Archit Kotalwar', phone, password: 'test1234', role: 'farmer', language: 'en' }) })).json()
  }
  await send('Page.navigate', { url: 'http://localhost:5173/login' })
  await sleep(1500)
  await ev(`localStorage.setItem('farmguard_token', ${JSON.stringify(reg.token)}); localStorage.setItem('farmguard_lang','en')`)
  await send('Page.navigate', { url: 'http://localhost:5173/farm' })
  await sleep(3000)

  if (step === 'save') {
    await ev(`(() => {
      const set = (sel, v) => { const el = document.querySelector(sel); const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) }
      set('#village', 'goad'); set('#district', 'Mahendragarh'); set('#state', 'Haryana'); set('#area', '10')
    })()`)
    // place the map marker like a tap (26.191307, 91.692459 from the screenshot) via GPS mock
    await send('Emulation.setGeolocationOverride', { latitude: 26.191307, longitude: 91.692459, accuracy: 10 })
    await send('Browser.grantPermissions', { permissions: ['geolocation'], origin: 'http://localhost:5173' })
    await ev(`[...document.querySelectorAll('button')].find(b => b.innerText.includes('Use my location')).click()`)
    await sleep(1500)
    await ev(`[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Save').click()`)
    await sleep(2500)
    const r = await ev(`(document.querySelector('form p.text-red-600')?.innerText || 'no error') + ' | button: ' + [...document.querySelectorAll('form button')].pop().innerText`)
    const saved = await (await fetch('http://localhost:5173/api/farm', { headers: { Authorization: `Bearer ${reg.token}` } })).json()
    console.log('UI   :', r)
    console.log('DB   :', saved.village, saved.district, saved.state, saved.latitude, saved.longitude, saved.area_acres)
  } else {
    await sleep(2000)
    console.log('PAGE  :', await ev(`location.pathname + ' | ' + (document.querySelector('[role=alert]')?.innerText || document.querySelector('.text-red-600, .text-red-700')?.innerText || 'no message')`))
    console.log('TOKEN kept:', await ev(`!!localStorage.getItem('farmguard_token')`))
  }
}
main().then(() => { proc.kill(); process.exit(0) }).catch((e) => { console.error(e); proc.kill(); process.exit(1) })
