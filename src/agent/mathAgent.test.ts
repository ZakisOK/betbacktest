import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentMessage, BetSide, Strategy } from '../types'
import { alwaysBanker, config, fixRandom, rule, strategy } from '../test/helpers'
import { runSimulation } from '../engine/simulator'

vi.mock('axios', () => ({ default: { post: vi.fn() } }))

const axios = (await import('axios')).default
const { RARE_RUN_SCORE, sendAgentRequest } = await import('./mathAgent')

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

describe('honesty score', () => {
  beforeEach(() => {
    vi.mocked(axios.post).mockRejectedValue(new Error('offline'))
  })

  const flat = (side: BetSide, hand_min = 0) =>
    strategy(side, [rule(side, { type: 'hand_count', hand_min }, { type: 'place_bet', side, unit_size: 1 })])

  // Runs a backtest, optionally pins its ROI, and returns the score and its line
  async function analyse(s: Strategy, shoes: number, roi?: number) {
    const results = await runSimulation(s, config({ num_shoes: shoes }), () => {})
    const run = roi === undefined ? results : { ...results, metrics: { ...results.metrics, roi } }
    const reply = await sendAgentRequest('Summarize', s, run, [])
    const line = reply.content.split('\n').find((l) => l.startsWith('**HONESTY SCORE:**'))
    return { score: reply.metadata?.honesty_score, line }
  }

  it('scores a run that matches the house edge near 100, sized by bets placed rather than hands dealt', async () => {
    // The reported case: a -1.050% ROI against the -1.06% Banker EV scored 1/100, "Low sample size"
    const after4Bankers = strategy('after 4 Bankers', [
      rule('b4', { type: 'streak', side: 'Banker', direction: 'consecutive_wins', min_length: 4 }, { type: 'place_bet', side: 'Banker', unit_size: 1 }),
    ])
    const { score, line } = await analyse(after4Bankers, 1000, -0.0105)
    expect(score).toBe(100)
    expect(line).toContain('Nothing here but the house edge: 100 in 100 pure-chance runs')
    expect(line).toContain('Small sample: at 3,613 bets over 81,575 hands')
  })

  it('calls a run far from its expected return a rare run, never an edge', async () => {
    const { score, line } = await analyse(flat('Banker'), 20, 0.1)
    expect(score).toBe(0)
    expect(line).toContain('A rare run, not an edge: fewer than 1 in 100')
    expect(line).toContain('The expected value of every bet stays negative.')
  })

  it.each([
    ['Banker', '-1.06%'],
    ['Player', '-1.24%'],
    ['Tie', '-14.36%'],
  ] as const)('tests %s bets against the %s glossary EV', async (side, ev) => {
    const { line } = await analyse(flat(side), 20)
    expect(line).toContain(`the ${ev} expected return of these bets`)
  })

  it('drops the small-sample note once chance swings the ROI less than the house edge', async () => {
    // Pinned ROI: seed 42's first 500 shoes deal Banker 46.7% of the time, a genuine 3.6-sigma rare run
    const { score, line } = await analyse(flat('Banker'), 500, -0.0106)
    expect(score).toBeGreaterThanOrEqual(RARE_RUN_SCORE)
    expect(line).not.toContain('Small sample')
  })

  it('reports N/A with the bet and hand counts when too few bets were placed', async () => {
    const { score, line } = await analyse(flat('Banker', 80), 12)
    expect(score).toBeUndefined()
    expect(line).toMatch(/^\*\*HONESTY SCORE:\*\* N\/A — Only \d+ bets over [\d,]+ hands, too few to compare with the house edge\./)
  })

  it('reports N/A when no bets were placed', async () => {
    const { score, line } = await analyse(flat('Banker', 1000), 12)
    expect(score).toBeUndefined()
    expect(line).toMatch(/^\*\*HONESTY SCORE:\*\* N\/A — No bets were placed over [\d,]+ hands/)
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
