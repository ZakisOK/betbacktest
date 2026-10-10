import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentMessage } from '../types'
import { alwaysBanker, config, fixRandom, rule, strategy } from '../test/helpers'
import { runSimulation } from '../engine/simulator'

vi.mock('axios', () => ({ default: { post: vi.fn() } }))

const axios = (await import('axios')).default
const { sendAgentRequest } = await import('./mathAgent')

function stable(m: AgentMessage) {
  const { id: _id, timestamp: _t, ...rest } = m
  return rest
}

beforeEach(() => {
  fixRandom()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const capped = strategy('capped', [
  rule('m', { type: 'streak', side: 'Any', direction: 'consecutive_losses', min_length: 1 }, { type: 'adjust_unit', method: 'martingale' }, 0, { max_bet: 640 }),
  alwaysBanker,
])

describe('sendAgentRequest offline fallback', () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockRejectedValue(new Error('offline'))
  })

  it('explains that no backtest has run', async () => {
    expect(stable(await sendAgentRequest('What do you think?', capped, null, []))).toMatchSnapshot()
  })

  it.each([
    ['small run, martingale question', 'Is martingale safe?', 30, capped],
    ['large run', 'Summarize', 20, strategy('banker', [alwaysBanker])],
    ['losing run, martingale question', 'MARTINGALE?', 60, strategy('tie', [rule('t', { type: 'hand_count', hand_min: 0 }, { type: 'place_bet', side: 'Tie' }, 0)])],
  ] as const)('analyses a %s', async (_name, question, shoes, s) => {
    const results = await runSimulation(s, config({ num_shoes: shoes }), () => {})
    expect(stable(await sendAgentRequest(question, s, results, []))).toMatchSnapshot()
  })
})

describe('sendAgentRequest with the API', () => {
  it('reads the honesty score and confidence from the reply', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { content: [{ text: '**CONFIDENCE:** 77/100\n**HONESTY SCORE:** 82/100' }] },
    })
    const history: AgentMessage[] = [
      { id: '1', role: 'system', content: 'ignored', timestamp: '' },
      { id: '2', role: 'user', content: 'hi', timestamp: '' },
      { id: '3', role: 'assistant', content: 'hello', timestamp: '' },
    ]
    const out = await sendAgentRequest('Go', capped, null, history)
    expect(stable(out)).toMatchSnapshot()
    expect(vi.mocked(axios.post).mock.calls[0]?.[1]).toMatchSnapshot()
  })

  it('leaves scores empty when the reply has none', async () => {
    vi.mocked(axios.post).mockResolvedValue({ data: {} })
    expect(stable(await sendAgentRequest('Go', capped, null, []))).toMatchSnapshot()
  })
})
