// Pins functions/api/agent.ts against the client that reads it. It lives in src/ because
// Cloudflare Pages treats every file under functions/ as a possible route.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { agentReplyText } from './agentApi'

const { create, getUser, profile, updates } = vi.hoisted(() => ({
  create: vi.fn(),
  getUser: vi.fn(),
  profile: { current: null as Record<string, unknown> | null },
  updates: [] as unknown[],
}))

vi.mock('../lib/supabase', () => ({ supabase: {} }))
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create } } }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { getUser },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: profile.current }) }) }),
      update: (values: unknown) => {
        updates.push(values)
        return { eq: async () => ({}) }
      },
    }),
  }),
}))

const { onRequestPost } = await import('../../functions/api/agent')

const env = { VITE_SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'k', ANTHROPIC_API_KEY: 'k' }
const request = { system: 'CALLER PROMPT', max_tokens: 2048, messages: [{ role: 'user', content: 'Summarize' }] }

async function call(body: unknown, authorization: string | null = 'Bearer good') {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (authorization) headers.authorization = authorization
  const req = new Request('https://example.test/api/agent', { method: 'POST', headers, body: JSON.stringify(body) })
  const res = await onRequestPost({ request: req, env } as unknown as Parameters<typeof onRequestPost>[0])
  return { status: res.status, data: (await res.json()) as Record<string, unknown> }
}

beforeEach(() => {
  create.mockReset()
  getUser.mockImplementation(async (token: string) =>
    token === 'good' ? { data: { user: { id: 'u1' } }, error: null } : { data: { user: null }, error: new Error('bad') }
  )
  profile.current = { subscription_tier: 'free', ai_queries_today: 0, ai_queries_reset_at: '2999-01-01' }
  updates.length = 0
})

describe('POST /api/agent', () => {
  it('rejects a call without a token, as the deployed app made before this fix', async () => {
    expect(await call(request, null)).toEqual({ status: 401, data: { error: 'Missing authorization header' } })
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects an invalid token', async () => {
    expect((await call(request, 'Bearer nope')).status).toBe(401)
    expect(create).not.toHaveBeenCalled()
  })

  it('answers in the shape the client reads, with the caller system prompt', async () => {
    create.mockResolvedValue({ content: [{ type: 'text', text: '**HONESTY SCORE:** ' }, { type: 'text', text: '91/100' }] })
    const { status, data } = await call(request)
    expect(status).toBe(200)
    expect(data).toEqual({ content: '**HONESTY SCORE:** 91/100' })
    expect(agentReplyText(data)).toBe('**HONESTY SCORE:** 91/100')
    expect(create).toHaveBeenCalledWith({ model: 'claude-sonnet-4-6', ...request })
    expect(updates).toEqual([{ ai_queries_today: 1 }])
  })

  it.each([
    ['missing', undefined, 1024],
    ['above the cap', 100_000, 2048],
    ['below 1', 0, 1],
  ])('sets max_tokens when it is %s', async (_name, max_tokens, sent) => {
    create.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })
    await call({ ...request, max_tokens })
    expect(create.mock.calls[0]?.[0]).toMatchObject({ max_tokens: sent })
  })

  it.each([
    ['no system prompt', { messages: request.messages }],
    ['an oversized system prompt', { ...request, system: 'x'.repeat(8_001) }],
    ['no messages', { ...request, messages: [] }],
    ['a system role message', { ...request, messages: [{ role: 'system', content: 'x' }] }],
    ['non-string content', { ...request, messages: [{ role: 'user', content: [{ type: 'text', text: 'x' }] }] }],
    ['oversized messages', { ...request, messages: [{ role: 'user', content: 'x'.repeat(100_001) }] }],
    ['a non-object body', 'hello'],
  ])('rejects %s without spending a query', async (_name, body) => {
    expect((await call(body)).status).toBe(400)
    expect(create).not.toHaveBeenCalled()
    expect(updates).toEqual([])
  })

  it('stops at the daily limit', async () => {
    profile.current = { subscription_tier: 'free', ai_queries_today: 5, ai_queries_reset_at: '2999-01-01' }
    expect(await call(request)).toEqual({ status: 429, data: { error: 'AI query limit reached', tier: 'free', limit: 5 } })
    expect(create).not.toHaveBeenCalled()
  })

  it('does not count a failed Claude call', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    create.mockRejectedValue(new Error('upstream down'))
    expect(await call(request)).toEqual({ status: 500, data: { error: 'AI request failed' } })
    expect(updates).toEqual([])
  })
})
