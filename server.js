/**
 * Baccarat Strategy Dashboard - API Proxy Server
 * Proxies requests to Claude API to keep API key server-side
 */
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'

const app = express()
const PORT = process.env.PORT || 3001
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '10mb' }))

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString(),
  })
})

// Claude API proxy
app.post('/api/agent', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'ANTHROPIC_API_KEY not configured. Set it in your .env file.',
    })
  }

  try {
    const { model, system, messages, max_tokens, stream } = req.body

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-5',
        max_tokens: max_tokens || 4096,
        system,
        messages,
        stream: stream || false,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return res.status(response.status).json({ error })
    }

    const data = await response.json()
    res.json(data)
  } catch (err) {
    console.error('Agent API error:', err)
    res.status(500).json({ error: err.message })
  }
})

createServer(app).listen(PORT, () => {
  console.log(`\n🎴 Baccarat Strategy Dashboard API`)
  console.log(`   Proxy server running on http://localhost:${PORT}`)
  console.log(`   Claude API key: ${ANTHROPIC_API_KEY ? '✓ configured' : '✗ not set'}`)
  if (!ANTHROPIC_API_KEY) {
    console.log(`\n   To enable AI features, set ANTHROPIC_API_KEY in your .env file`)
  }
})
