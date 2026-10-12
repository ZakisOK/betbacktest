import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

interface Env {
  VITE_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  ANTHROPIC_API_KEY: string
}

const TIER_LIMITS: Record<string, number> = {
  free: 5,
  pro: 50,
  lab: Infinity,
}

// The proxy contract, shared with the local server.js and read by src/agent/agentApi.ts:
//   request:  POST { system, messages, max_tokens? } with the caller's Supabase access token as a Bearer header
//   response: { content: string } on success, { error } otherwise
// Each caller owns its system prompt (analysis, rule parsing and the concept builder need
// different ones); this endpoint owns access, the daily quota, the model and the token cap.
const MODEL = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 1024
const MAX_TOKENS = 2048
const MAX_SYSTEM_CHARS = 8_000
const MAX_MESSAGES = 20
const MAX_MESSAGE_CHARS = 100_000

interface AgentRequest {
  system: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  max_tokens: number
}

// Returns the request, or an error message for a 400
function parseRequest(body: unknown): AgentRequest | string {
  if (typeof body !== 'object' || body === null) return 'Body must be a JSON object'
  const { system, messages, max_tokens } = body as Record<string, unknown>
  if (typeof system !== 'string' || system.length === 0) return 'system must be a non-empty string'
  if (system.length > MAX_SYSTEM_CHARS) return `system must be at most ${MAX_SYSTEM_CHARS} characters`
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return `messages must be an array of 1 to ${MAX_MESSAGES} messages`
  }
  let chars = 0
  for (const m of messages as Array<{ role?: unknown; content?: unknown }>) {
    if ((m?.role !== 'user' && m?.role !== 'assistant') || typeof m.content !== 'string') {
      return 'each message needs a user or assistant role and string content'
    }
    chars += m.content.length
  }
  if (chars > MAX_MESSAGE_CHARS) return `messages must total at most ${MAX_MESSAGE_CHARS} characters`
  const requested = typeof max_tokens === 'number' && Number.isFinite(max_tokens) ? Math.floor(max_tokens) : DEFAULT_MAX_TOKENS
  return {
    system,
    messages: messages as AgentRequest['messages'],
    max_tokens: Math.min(MAX_TOKENS, Math.max(1, requested)),
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Missing authorization header' }, { status: 401 })
  }

  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  const parsed = parseRequest(await request.json().catch(() => null))
  if (typeof parsed === 'string') return Response.json({ error: parsed }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, ai_queries_today, ai_queries_reset_at')
    .eq('id', user.id)
    .single()

  if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 })

  const today = new Date().toISOString().split('T')[0]
  let queriesUsed = profile.ai_queries_today

  if (profile.ai_queries_reset_at < today) {
    queriesUsed = 0
    await supabase
      .from('profiles')
      .update({ ai_queries_today: 0, ai_queries_reset_at: today })
      .eq('id', user.id)
  }

  const limit = TIER_LIMITS[profile.subscription_tier] ?? 5
  if (queriesUsed >= limit) {
    return Response.json(
      { error: 'AI query limit reached', tier: profile.subscription_tier, limit },
      { status: 429 }
    )
  }

  try {
    const response = await anthropic.messages.create({ model: MODEL, ...parsed })

    await supabase
      .from('profiles')
      .update({ ai_queries_today: queriesUsed + 1 })
      .eq('id', user.id)

    const text = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('')
    return Response.json({ content: text })
  } catch (err) {
    console.error('Claude API error:', err)
    return Response.json({ error: 'AI request failed' }, { status: 500 })
  }
}

export const onRequest: PagesFunction<Env> = (context) => {
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  return onRequestPost(context)
}
