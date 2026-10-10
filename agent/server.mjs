// FarmGuard Agent — a tiny Cline SDK (@cline/agents) agent behind Ask FarmGuard.
// The Python backend POSTs {question, language, farm, note, history} to http://127.0.0.1:8010/ask.
// The agent gets one tool, get_farm_info, that returns this farmer's live data (crop, weather,
// irrigation decision, nearby disease alerts). If this service is not running, the backend
// simply falls back to its normal answers, so nothing breaks.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Agent } from '@cline/agents'

const here = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.AGENT_PORT || 8010)

// Read LLM_API_KEY / LLM_MODEL from backend/.env (same Cline key as the backend).
function readEnv() {
  const env = {}
  try {
    const txt = fs.readFileSync(path.join(here, '..', 'backend', '.env'), 'utf8')
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* no .env */ }
  return { ...env, ...process.env }
}
const env = readEnv()
const API_KEY = env.CLINE_API_KEY || env.LLM_API_KEY || ''
const MODEL = env.CLINE_MODEL || env.LLM_MODEL || 'anthropic/claude-haiku-5.5'

const SYSTEM = (lang) =>
  `You are FarmGuard, a farming assistant for Indian smallholder farmers. ` +
  `ALWAYS call the get_farm_info tool first, then answer using that data. ` +
  `Answer in ${lang === 'hi' ? 'Hindi (Devanagari script)' : 'English'}, in simple words, max 120 words. ` +
  `Never invent prices, doses or scheme amounts; if unsure, suggest the local KVK / Krishi officer. ` +
  `For pesticides always say "as per label". No markdown headings.`

async function ask({ question, language = 'en', farm = {}, note = '', history = [] }) {
  const used = []
  const getFarmInfo = {
    name: 'get_farm_info',
    description: "Get this farmer's farm profile and live data: crop, location, soil, today's weather, irrigation decision and nearby disease alerts.",
    inputSchema: { type: 'object', properties: {}, required: [] },
    async execute() {
      used.push('get_farm_info')
      return { farm, reference_note: note || null }
    },
  }
  const agent = new Agent({
    providerId: 'cline',
    modelId: MODEL,
    apiKey: API_KEY,
    systemPrompt: SYSTEM(language),
    tools: [getFarmInfo],
  })
  const past = history
    .filter((h) => (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string')
    .slice(-6)
    .map((h) => `${h.role === 'user' ? 'Farmer' : 'FarmGuard'}: ${h.content.slice(0, 400)}`)
    .join('\n')
  const prompt = past ? `Earlier chat:\n${past}\n\nFarmer's question: ${question}` : question
  const result = await agent.run(prompt)
  if (result.status && result.status !== 'completed') throw new Error(`agent ${result.status}`)
  const text = (result.outputText || '').trim()
  if (!text) throw new Error('empty answer')
  return { answer: text, tools_used: used, model: MODEL }
}

const server = http.createServer((req, res) => {
  const send = (code, obj) => {
    res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify(obj))
  }
  if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true, sdk: '@cline/agents', model: MODEL, key: !!API_KEY })
  if (req.method !== 'POST' || req.url !== '/ask') return send(404, { error: 'not found' })
  let body = ''
  req.on('data', (c) => { body += c; if (body.length > 200_000) req.destroy() })
  req.on('end', async () => {
    try {
      if (!API_KEY) return send(503, { error: 'No Cline API key (LLM_API_KEY in backend/.env)' })
      const out = await ask(JSON.parse(body || '{}'))
      send(200, out)
    } catch (e) {
      send(500, { error: String(e?.message || e) })
    }
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`FarmGuard Agent (Cline SDK) on http://127.0.0.1:${PORT}  model=${MODEL}  key=${API_KEY ? 'yes' : 'MISSING'}`)
})
