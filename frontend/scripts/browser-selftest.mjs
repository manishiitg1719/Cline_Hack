// Runs selftest.html in headless Edge/Chrome via the DevTools protocol and prints the model results.
// Usage: (dev server running) node scripts/browser-selftest.mjs [browserPath]
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const browser = process.argv[2] || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const port = 9333
const profile = mkdtempSync(path.join(tmpdir(), 'fg-'))
const proc = spawn(browser, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  let target
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250)
    try {
      target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page')
    } catch { /* not up yet */ }
  }
  if (!target) throw new Error('browser did not start')
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  const blocked = []
  const urls = new Map()
  const BASE_URL = process.env.SELFTEST_URL || 'http://localhost:5173'
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id) }
    if (msg.method === 'Runtime.exceptionThrown') console.log('EXCEPTION', msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text)
    if (msg.method === 'Network.requestWillBeSent') urls.set(msg.params.requestId, msg.params.request.url)
    if (msg.method === 'Network.loadingFailed' && msg.params.blockedReason) blocked.push(urls.get(msg.params.requestId))
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') console.log('CONSOLE', msg.params.args.map((a) => a.value || a.description).join(' '))
  })
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
  await send('Runtime.enable')
  await send('Network.enable')

  const runOnce = async (label) => {
    await send('Page.navigate', { url: `${BASE_URL}/selftest.html` })
    for (let i = 0; i < 120; i++) {
      await sleep(500)
      const r = await send('Runtime.evaluate', { expression: "document.getElementById('result')?.textContent || ''" })
      const text = r?.result?.value || ''
      if (text.includes('RESULT') || text.includes('ERROR')) {
        console.log(`--- ${label} ---\n${text}`)
        return !text.includes('ERROR') && /RESULT (\d+)\/\1/.test(text)
      }
    }
    const dbg = await send('Runtime.evaluate', { expression: "document.getElementById('cache')?.textContent + ' | ' + document.getElementById('result')?.textContent" })
    console.log(`--- ${label} --- TIMEOUT :: ${dbg?.result?.value}`)
    return false
  }

  const online = await runOnce('ONLINE (first load, downloads + caches model)')
  // Block every request for model/runtime files: they must now come from the device cache.
  // (exact file URLs only — in Vite dev the `?url` import itself is a JS module that must still load)
  await send('Network.setBlockedURLs', {
    urls: ['*/models/disease/model.onnx', '*/models/disease/centroids.f32', '*/models/disease/meta.json', '*ort-wasm-simd-threaded.wasm'],
  })
  const offline = await runOnce('MODEL FILES BLOCKED (must load from device cache)')
  console.log(`(blocked during offline run: ${blocked.join(', ') || 'none'})`)
  return online && offline ? 0 : 1
}

main().then((code) => { proc.kill(); process.exit(code) }).catch((e) => { console.error(e); proc.kill(); process.exit(1) })
