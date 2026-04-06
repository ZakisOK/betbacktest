import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const TIER_LIMITS: Record<string, number> = {
  free: 5,
  pro: 50,
  lab: Infinity,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' })

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, ai_queries_today, ai_queries_reset_at')
    .eq('id', user.id)
    .single()

  if (!profile) return res.status(404).json({ error: 'Profile not found' })

  const today = new Date().toISOString().split('T')[0]
  let queriesUsed = profile.ai_queries_today

  // Reset if date changed
  if (profile.ai_queries_reset_at < today) {
    queriesUsed = 0
    await supabase
      .from('profiles')
      .update({ ai_queries_today: 0, ai_queries_reset_at: today })
      .eq('id', user.id)
  }

  const limit = TIER_LIMITS[profile.subscription_tier] ?? 5
  if (queriesUsed >= limit) {
    return res.status(429).json({ error: 'AI query limit reached', tier: profile.subscription_tier, limit })
  }

  const { messages, strategy, backtestResults } = req.body as {
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
Current strategy context: ${JSON.stringify(strategy ?? {})}
Backtest results context: ${JSON.stringify(backtestResults ?? {})}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    // Increment query counter
    await supabase
      .from('profiles')
      .update({ ai_queries_today: queriesUsed + 1 })
      .eq('id', user.id)

    const content = response.content[0]
    const text = content.type === 'text' ? content.text : ''
    return res.status(200).json({ content: text })
  } catch (err) {
    console.error('Claude API error:', err)
    return res.status(500).json({ error: 'AI request failed' })
  }
}
