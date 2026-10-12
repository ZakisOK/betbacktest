/**
 * Baccarat Strategy Dashboard - local Claude proxy (dev only)
 *
 * Stands in for functions/api/agent.ts during `npm run dev`; vite.config.ts
 * forwards /api/agent here. Same contract, minus sign-in and the daily quota:
 *   request:  POST { system, messages, max_tokens? }
 *   response: { content: string } on success, { error } otherwise
 * Keep MODEL and MAX_TOKENS in step with functions/api/agent.ts.
 */
import { createServer } from 'node:http'
import Anthropic from '@anthropic-ai/sdk'

try {
  process.loadEnvFile()
} catch {
  // No .env file: use the shell's environment
}

const PORT = Number(process.env.PORT || 3001)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const MODEL = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 1024
const MAX_TOKENS = 2048
const MAX_BODY_BYTES = 1_000_000

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null

function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(data))
}

async function readJson(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('Request body too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

async function handleAgent(req, res) {
  if (!anthropic) {
    return send(res, 503, { error: 'ANTHROPIC_API_KEY not configured. Set it in your .env file.' })
  }

  let body
  try {
    body = await readJson(req)
  } catch (err) {
    return send(res, 400, { error: err.message })
  }
  const { system, messages, max_tokens } = body ?? {}
  if (typeof system !== 'string' || !Array.isArray(messages) || messages.length === 0) {
    return send(res, 400, { error: 'Expected { system: string, messages: [...] }' })
  }
  const requested = Number.isFinite(max_tokens) ? Math.floor(max_tokens) : DEFAULT_MAX_TOKENS

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: Math.min(MAX_TOKENS, Math.max(1, requested)),
      system,
      messages,
    })
    const text = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('')
    send(res, 200, { content: text })
  } catch (err) {
    console.error('Agent API error:', err)
    send(res, err.status ?? 500, { error: err.message })
  }
}

const server = createServer((req, res) => {
  const path = req.url?.split('?')[0]
  if (req.method === 'GET' && path === '/api/health') {
    return send(res, 200, { status: 'ok', hasApiKey: !!ANTHROPIC_API_KEY, timestamp: new Date().toISOString() })
  }
  if (req.method === 'POST' && path === '/api/agent') return handleAgent(req, res)
  send(res, 404, { error: 'Not found' })
})

// Loopback only: this proxy spends the API key for anyone who can reach it
server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🎴 Baccarat Strategy Dashboard API`)
  console.log(`   Proxy server running on http://127.0.0.1:${PORT}`)
  console.log(`   Claude API key: ${ANTHROPIC_API_KEY ? '✓ configured' : '✗ not set'}`)
  if (!ANTHROPIC_API_KEY) {
    console.log(`\n   To enable AI features, set ANTHROPIC_API_KEY in your .env file`)
  }
})
