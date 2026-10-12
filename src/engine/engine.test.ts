import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Action, BacktestResults, ProgressionMethod, Trigger } from '../types'
import { alwaysBanker, config, fingerprint, fixRandom, rule, strategy } from '../test/helpers'
import { dealHand, generateShoe, mulberry32 } from './baccarat'
import { runSimulation } from './simulator'
import { calculateMetrics, fmtCurrency, fmtNumber, fmtPct } from './metrics'
import { analyzePatterns } from './patternAnalyzer'
import { runDiscovery } from './discoveryEngine'

vi.mock('../agent/mathAgent', () => ({
  sendAgentRequest: vi.fn(),
}))

const { sendAgentRequest } = await import('../agent/mathAgent')
const { runAutoOptimizer } = await import('./autoOptimizer')

// Drops the fields that change on every run (clock, timings) so the rest
// can be pinned exactly.
function stable(r: BacktestResults) {
  const { completed_at: _c, duration_ms: _d, ...rest } = r
  return rest
}

function summary(r: BacktestResults) {
  const m = r.metrics
  return {
    fingerprint: fingerprint(stable(r)),
    net_pnl: m.net_pnl,
    total_hands: m.total_hands,
    win_rate: m.win_rate,
    max_drawdown: m.max_drawdown,
  }
}

beforeEach(() => {
  fixRandom()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('mulberry32', () => {
  it('produces the same sequence for a seed', () => {
    const seeds = [0, 1, 42, 2 ** 31 - 1, 2 ** 31, 2 ** 32 + 5, -5, 123456789]
    const out = seeds.map(seed => {
      const rng = mulberry32(seed)
      return Array.from({ length: 6 }, () => rng())
    })
    expect(out).toMatchSnapshot()
  })
})

describe('shoe and hand dealing', () => {
  it('deals the same hands from a seeded shoe', () => {
    for (const decks of [6, 8] as const) {
      const shoe = generateShoe(decks, mulberry32(7))
      const hands = Array.from({ length: 40 }, () => dealHand(shoe))
      expect(fingerprint(hands)).toMatchSnapshot(`${decks} decks`)
    }
  })
})

// 8-deck outcome probabilities, from harness/docs/glossary.md.
const odds = { Banker: 45.86, Player: 44.62, Tie: 9.52 }

describe('dealing to the cut card', () => {
  // A hand uses about 4.94 cards, so the 401 cards in front of a 14-card cut
  // in 8 decks give about 81 hands, and the 297 in 6 decks about 60.
  it.each([
    [8, [80, 83], [72, 92]],
    [6, [59, 62], [52, 70]],
  ] as const)('deals a full %i-deck shoe', async (decks, [avgMin, avgMax], [shoeMin, shoeMax]) => {
    const r = await runSimulation(strategy('watch', []), config({ deck_count: decks, num_shoes: 500, random_seed: 3 }), () => {})
    const perShoe = r.shoes.map(s => s.hands_played)
    const avg = r.metrics.total_hands / perShoe.length
    expect(avg).toBeGreaterThanOrEqual(avgMin)
    expect(avg).toBeLessThanOrEqual(avgMax)
    expect(Math.min(...perShoe)).toBeGreaterThanOrEqual(shoeMin)
    expect(Math.max(...perShoe)).toBeLessThanOrEqual(shoeMax)
  })

  it('matches the Banker, Player and Tie probabilities over many shoes', async () => {
    const r = await runSimulation(strategy('watch', []), config({ num_shoes: 2000, random_seed: 11 }), () => {})
    const hands = r.shoes.flatMap(s => s.hands)
    const pct = (outcome: keyof typeof odds) => (100 * hands.filter(h => h.outcome === outcome).length) / hands.length
    // About 163,000 hands puts one standard error near 0.12 points (0.07 for
    // Tie), so these bounds sit about four standard errors out.
    expect(Math.abs(pct('Banker') - odds.Banker)).toBeLessThan(0.5)
    expect(Math.abs(pct('Player') - odds.Player)).toBeLessThan(0.5)
    expect(Math.abs(pct('Tie') - odds.Tie)).toBeLessThan(0.3)
  })

  // Streak counters reset every shoe, so a shoe cut short never reaches long streaks.
  it('fires a four-win streak trigger', async () => {
    const fourBankers: Trigger = { type: 'streak', side: 'Banker', direction: 'consecutive_wins', min_length: 4 }
    const s = strategy('after 4 Bankers', [rule('after 4 Bankers', fourBankers, { type: 'place_bet', side: 'Banker', unit_size: 1 })])
    const r = await runSimulation(s, config({ num_shoes: 200, random_seed: 7 }), () => {})
    expect(r.shoes.flatMap(sh => sh.hands).some(h => !h.skipped)).toBe(true)
  })
})

const triggers: Record<string, Trigger> = {
  'streak banker wins 2': { type: 'streak', side: 'Banker', direction: 'consecutive_wins', min_length: 2 },
  'streak player wins 3': { type: 'streak', side: 'Player', direction: 'consecutive_wins', min_length: 3 },
  'streak any wins 2': { type: 'streak', side: 'Any', direction: 'consecutive_wins', min_length: 2 },
  'streak banker losses 2': { type: 'streak', side: 'Banker', direction: 'consecutive_losses', min_length: 2 },
  'streak any losses 3': { type: 'streak', side: 'Any', direction: 'consecutive_losses', min_length: 3 },
  'streak tie wins 1': { type: 'streak', side: 'Tie', direction: 'consecutive_wins', min_length: 1 },
  'alternating 2': { type: 'streak', side: 'Any', direction: 'alternating', min_length: 2 },
  'streak no direction': { type: 'streak', side: 'Banker', min_length: 1 },
  'pattern B-P-B': { type: 'pattern', pattern: 'B-P-B' },
  'pattern b-b lookback 5': { type: 'pattern', pattern: 'b-b', lookback: 5 },
  'pattern empty': { type: 'pattern', pattern: '' },
  'session loss -50': { type: 'financial_state', condition: 'session_loss', threshold: -50 },
  'session profit 40': { type: 'financial_state', condition: 'session_profit', threshold: 40 },
  'bankroll below 4990': { type: 'financial_state', condition: 'bankroll_below', threshold: 4990 },
  'bankroll above 5010': { type: 'financial_state', condition: 'bankroll_above', threshold: 5010 },
  'hands 10 to 30': { type: 'hand_count', hand_min: 10, hand_max: 30 },
  'statistical': { type: 'statistical', deviation_sigma: 2 },
  'composite AND': {
    type: 'composite',
    operator: 'AND',
    sub_triggers: [
      { type: 'streak', side: 'Banker', direction: 'consecutive_wins', min_length: 1 },
      { type: 'hand_count', hand_min: 5 },
    ],
  },
  'composite OR': {
    type: 'composite',
    operator: 'OR',
    sub_triggers: [
      { type: 'pattern', pattern: 'P-P' },
      { type: 'streak', side: 'Tie', direction: 'consecutive_wins', min_length: 1 },
    ],
  },
}

const methods: ProgressionMethod[] = ['flat', 'multiply', 'add', 'martingale', 'fibonacci', 'dalembert', 'labouchere', 'oscars_grind', '1326']

const actions: Record<string, Action> = {
  'bet player 2u': { type: 'place_bet', side: 'Player', unit_size: 2 },
  'bet tie': { type: 'place_bet', side: 'Tie', unit_size: 1 },
  'skip 2': { type: 'skip_hand', skip_count: 2 },
  'reset': { type: 'reset_progression', reset_to: 1 },
  'lock player 3': { type: 'lock_side', side: 'Player', lock_duration: 3 },
  'stop loss -80': { type: 'stop_loss', threshold: -80 },
  'take profit 60': { type: 'take_profit', threshold: 60 },
  ...Object.fromEntries(methods.map(m => [`adjust ${m}`, { type: 'adjust_unit', method: m, value: 2, unit_size: 1 } as Action])),
}

describe('runSimulation', () => {
  it.each(Object.entries(triggers))('trigger: %s', async (name, trigger) => {
    const s = strategy(name, [rule(name, trigger, { type: 'place_bet', side: 'Player', unit_size: 1 }, 0), alwaysBanker])
    const r = await runSimulation(s, config(), () => {})
    expect(summary(r)).toMatchSnapshot()
  })

  it.each(Object.entries(actions))('action: %s', async (name, action) => {
    const losses = { type: 'streak', side: 'Any', direction: 'consecutive_losses', min_length: 1 } as Trigger
    const s = strategy(name, [rule(name, losses, action, 0), alwaysBanker])
    const r = await runSimulation(s, config(), () => {})
    expect(summary(r)).toMatchSnapshot()
  })

  it.each(methods)('progression on wins and losses: %s', async method => {
    const s = strategy(method, [
      rule('reset on 3 wins', { type: 'streak', side: 'Any', direction: 'consecutive_wins', min_length: 3 }, { type: 'reset_progression' }, 0, { shoe_reset: 'carry' }),
      rule(method, { type: 'hand_count', hand_min: 0 }, { type: 'adjust_unit', method, value: 1.5 }, 1, { max_bet: 400, shoe_reset: 'carry' }),
    ])
    const r = await runSimulation(s, config({ num_shoes: 6 }), () => {})
    expect(summary(r)).toMatchSnapshot()
  })

  it('applies max bet and bankroll guard modifiers', async () => {
    const s = strategy('guarded', [
      rule('big bets', { type: 'hand_count', hand_min: 0 }, { type: 'place_bet', side: 'Banker', unit_size: 50 }, 0, { max_bet: 300, bankroll_guard: 0.9 }),
    ], 25, 2000)
    const r = await runSimulation(s, config({ starting_bankroll: 2000 }), () => {})
    expect(summary(r)).toMatchSnapshot()
  })

  it('stops a session and busts a bankroll', async () => {
    const s = strategy('reckless', [
      rule('martingale', { type: 'hand_count', hand_min: 0 }, { type: 'adjust_unit', method: 'martingale' }, 0, { shoe_reset: 'carry' }),
    ], 100, 1500)
    const r = await runSimulation(s, config({ starting_bankroll: 1500, num_shoes: 20 }), () => {})
    expect(summary(r)).toMatchSnapshot()
  })

  it('ends the run at a bust', async () => {
    const s = strategy('reckless', [
      rule('m', { type: 'hand_count', hand_min: 0 }, { type: 'adjust_unit', method: 'martingale' }, 0, { shoe_reset: 'carry' }),
    ], 100, 1500)
    const r = await runSimulation(s, config({ starting_bankroll: 1500, num_shoes: 20 }), () => {})
    const hands = r.shoes.flatMap(sh => sh.hands)
    expect(r.shoes.map(sh => sh.starting_bankroll).filter(b => b <= 0)).toEqual([])
    expect(r.shoes.length).toBeLessThan(20)
    expect(r.shoes[r.shoes.length - 1].ending_bankroll).toBeLessThanOrEqual(0)
    // The bust is the last hand of the run, and no hand before it went broke.
    expect(hands[hands.length - 1].bankroll).toBeLessThanOrEqual(0)
    expect(hands.slice(0, -1).filter(h => h.bankroll <= 0)).toEqual([])
  })

  it('ends only the session on a stop loss or take profit', async () => {
    const s = strategy('stops', [
      rule('stop loss', { type: 'financial_state', condition: 'session_loss', threshold: -50 }, { type: 'stop_loss', threshold: -50 }, 0),
      rule('take profit', { type: 'financial_state', condition: 'session_profit', threshold: 50 }, { type: 'take_profit', threshold: 50 }, 0),
      alwaysBanker,
    ])
    const r = await runSimulation(s, config(), () => {})
    expect(r.shoes).toHaveLength(12)
    // A shoe ends on the hand its session first reaches either threshold.
    const stoppedAt = r.shoes.map(sh => sh.hands.findIndex(h => Math.abs(h.bankroll - sh.starting_bankroll) >= 50))
    expect(stoppedAt.filter(i => i >= 0).length).toBeGreaterThan(0)
    expect(stoppedAt.filter((i, n) => i >= 0 && i !== r.shoes[n].hands.length - 1)).toEqual([])
  })

  it.each([
    ['6 decks', { deck_count: 6 }],
    ['ties lose, EZ Baccarat', { tie_handling: 'lose', table_rules: 'ez_baccarat' }],
    ['early cut card', { cut_card_position: 60 }],
    ['other seed', { random_seed: 2026 }],
  ] as const)('config: %s', async (_name, overrides) => {
    const s = strategy('banker', [alwaysBanker])
    const r = await runSimulation(s, config(overrides), () => {})
    expect(summary(r)).toMatchSnapshot()
  })

  it('reports progress', async () => {
    const seen: number[] = []
    await runSimulation(strategy('banker', [alwaysBanker]), config({ num_shoes: 250 }), pct => seen.push(pct))
    expect(seen).toMatchSnapshot()
  })
})

describe('calculateMetrics', () => {
  it('handles no shoes', () => {
    expect(calculateMetrics([], config())).toMatchSnapshot()
  })

  it('formats numbers', () => {
    const values = [0, 1.5, -1.5, 1234.567, -98765.4321, 0.000123, 1e6, Number.NaN, Infinity, -Infinity]
    expect(values.map(v => [fmtCurrency(v), fmtCurrency(v, 0), fmtPct(v), fmtNumber(v)])).toMatchSnapshot()
  })
})

describe('analyzePatterns (local)', () => {
  it.each([
    ['always banker', [alwaysBanker], {}],
    ['player after banker streak', [rule('p', triggers['streak banker wins 2'], { type: 'place_bet', side: 'Player' }, 0), alwaysBanker], {}],
    ['martingale bust', [rule('m', { type: 'hand_count', hand_min: 0 }, { type: 'adjust_unit', method: 'martingale' }, 0)], { starting_bankroll: 800 }],
    ['tie bets', [rule('t', { type: 'hand_count', hand_min: 0 }, { type: 'place_bet', side: 'Tie' }, 0)], { num_shoes: 30 }],
  ] as const)('%s', async (name, rules, overrides) => {
    const s = strategy(name, [...rules])
    const r = await runSimulation(s, config({ num_shoes: 40, ...overrides }), () => {})
    const analysis = await analyzePatterns(r, s, false)
    expect(analysis).toMatchSnapshot()
  })
})

describe('runDiscovery', () => {
  it('ranks the candidates the same way', async () => {
    const progress: string[] = []
    const out = await runDiscovery({
      baseUnit: 10,
      bankroll: 5000,
      numShoes: 3,
      targetMetric: 'profit_factor',
      signal: new AbortController().signal,
      onProgress: (done, total, best) => progress.push(`${done}/${total} ${best?.strategy.name ?? '-'}`),
    })
    expect(out.map(c => ({ name: c.strategy.name, rules: c.strategy.rules.map(r => r.label), score: c.score, result: summary(c.results!) }))).toMatchSnapshot()
    expect(progress).toMatchSnapshot()
  })

  it.each(['sharpe_ratio', 'roi', 'net_pnl'] as const)('scores by %s', async metric => {
    const out = await runDiscovery({
      baseUnit: 10,
      bankroll: 5000,
      numShoes: 2,
      targetMetric: metric,
      signal: new AbortController().signal,
      onProgress: () => {},
    })
    expect(out.map(c => [c.strategy.name, c.score])).toMatchSnapshot()
  })
})

describe('runAutoOptimizer', () => {
  const run = async (targetWinRate: number, maxIterations: number) => {
    const phases: string[] = []
    const state = await runAutoOptimizer({
      baseUnit: 10,
      bankroll: 5000,
      targetWinRate,
      maxIterations,
      fastShoes: 2,
      deepShoes: 3,
      signal: new AbortController().signal,
      onUpdate: s => phases.push(`${s.iteration}:${s.phase}:${s.bestWinRate.toFixed(6)}:${s.done}`),
    })
    return {
      phases,
      iteration: state.iteration,
      done: state.done,
      bestWinRate: state.bestWinRate,
      best: state.bestStrategy?.name,
      bestRules: state.bestStrategy?.rules.map(r => r.label),
      log: fingerprint(state.log),
      logLength: state.log.length,
    }
  }

  it('runs scan, deep, mutate and AI phases with usable AI advice', async () => {
    vi.mocked(sendAgentRequest).mockResolvedValue({
      id: 'x', role: 'assistant', timestamp: '',
      content: 'Try this: {"side":"Player","minWinStreak":3,"skipAfterLosses":1,"stopLoss":220,"takeProfit":410} good luck',
    })
    expect(await run(0.99, 4)).toMatchSnapshot()
  })

  it('falls back to mutation when the AI reply has no JSON', async () => {
    vi.mocked(sendAgentRequest).mockResolvedValue({ id: 'x', role: 'assistant', timestamp: '', content: 'no idea' })
    expect(await run(0.99, 3)).toMatchSnapshot()
  })

  it('falls back to mutation when the AI call fails', async () => {
    vi.mocked(sendAgentRequest).mockRejectedValue(new Error('offline'))
    expect(await run(0.99, 3)).toMatchSnapshot()
  })

  it('stops once the target win rate is reached', async () => {
    expect(await run(0.1, 5)).toMatchSnapshot()
  })

  it('stops when aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const state = await runAutoOptimizer({
      baseUnit: 10, bankroll: 5000, targetWinRate: 0.5, maxIterations: 3, fastShoes: 1, deepShoes: 1,
      signal: controller.signal, onUpdate: () => {},
    })
    expect(state.aborted).toBe(true)
  })
})
