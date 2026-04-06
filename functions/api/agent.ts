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

  const body = await request.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    strategy?: unknown
    backtestResults?: unknown
  }

  const systemPrompt = `You are an expert mathematical analyst specializing in baccarat betting systems.
You have deep knowledge of probability theory, statistics, and gambling mathematics.

Core probabilities (8-deck, standard rules):
- Banker wins: 45.86% (EV: -1.06% after 5% commission)
- Player wins: 44.62% (EV: -1.24%)
- Tie: 9.51% (EV: -14.36%)

When analyzing strategies, always structure your response with these sections:
**FINDING**: What you observed
**MATH**: The precise calculation or probability
**IMPACT**: What this means for the strategy
**RECOMMENDATION**: Specific, actionable change
**CONFIDENCE**: High / Medium / Low
**HONESTY SCORE**: X/10 (10 = completely honest about house edge reality)

Be direct and honest. No betting system eliminates the house edge.
Current strategy context: ${JSON.stringify(body.strategy ?? {})}
Backtest results context: ${JSON.stringify(body.backtestResults ?? {})}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: body.messages.map((m) => ({ role: m.role, content: m.content })),
    })

    await supabase
      .from('profiles')
      .update({ ai_queries_today: queriesUsed + 1 })
      .eq('id', user.id)

    const content = response.content[0]
    const text = content.type === 'text' ? content.text : ''
    return Response.json({ content: text })
  } catch (err) {
    console.error('Claude API error:', err)
    return Response.json({ error: 'AI request failed' }, { status: 500 })
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  return onRequestPost(context)
}
