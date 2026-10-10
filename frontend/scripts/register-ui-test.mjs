// Fills the real Register form in headless Edge and prints the result text.
// Usage: node scripts/register-ui-test.mjs <phone>   (frontend dev server on 5173)
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const phone = process.argv[2] || '9' + Math.floor(1e8 + Math.random() * 9e8)
const port = 9336
const proc = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(path.join(tmpdir(), 'fg-reg-'))}`, 'about:blank'], { stdio: 'ignore' })
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

  await send('Page.navigate', { url: 'http://localhost:5173/register' })
  await sleep(2500)
  await ev("localStorage.setItem('farmguard_lang','en'); location.reload()")
  await sleep(2500)
  // React-controlled inputs: use the native setter + input event
  await ev(`(() => {
    const set = (sel, v) => { const el = document.querySelector(sel); const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) }
    set('#name', 'Archit Kotalwar'); set('#phone', '${phone}'); set('#password', 'test1234')
    document.querySelector('form button.btn-primary').click()
  })()`)
  await sleep(3000)
  const out = await ev("(document.querySelector('p.text-red-600')?.innerText || '') + ' || URL=' + location.pathname + ' || ' + (document.querySelector('h1')?.innerText || '')")
  console.log(out)
}
main().then(() => { proc.kill(); process.exit(0) }).catch((e) => { console.error(e); proc.kill(); process.exit(1) })
