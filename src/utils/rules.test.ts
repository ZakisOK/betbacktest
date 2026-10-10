import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Action, Rule, Trigger } from '../types'
import { fixRandom, rule } from '../test/helpers'

vi.mock('axios', () => ({ default: { post: vi.fn() } }))

const axios = (await import('axios')).default
const { parseNLRule } = await import('./nlRuleParser')
const { ruleToSentence } = await import('./ruleToSentence')

beforeEach(() => {
  fixRandom()
  vi.mocked(axios.post).mockRejectedValue(new Error('offline'))
})

afterEach(() => {
  vi.restoreAllMocks()
})

// Every sentence shape the local parser knows, plus near misses that must
// fall through to the AI step.
const sentences = [
  'stop loss 200',
  'Stop loss $150.50',
  'stop when down more than 300',
  'stop when losing exceeds $ 75',
  'stop when loss over two',
  'take profit 500',
  'take profit at $250',
  'take profit when up 120',
  'quit when up over $400',
  'stop when profit exceeds 90',
  'stop when winning 3',
  'after 3 bankers increase bet 3 units then back to base',
  'after 3 banker wins raise the bet 2 units then reset after a win',
  'after two players in a row, add stake by one unit then reset after a loss',
  'after 4 ties bump wager 1',
  'after 2 xyz wins boost the bet 2 units',
  'after zero bankers increase bet 0 units',
  'increase bet 2 units after 3 losses then reset',
  'raise the bet by one unit when 2 consecutive wins',
  'bump stakes 3 on 1 loss',
  'add the bet 1 after 2 wins then back to base',
  'skip 2 hands after a tie',
  'skip one hand when bankroll drops',
  'skip 3 hands if player wins twice',
  'after a tie, skip 2',
  'on tie skip three',
  'bet on banker when bankroll below $4000',
  'wager player when balance above 6000',
  'play tie when bankroll under 1000',
  'place xyz when balance over 50',
  'use martingale after 3 consecutive losses',
  'use fibonacci progression when 2 consecutive wins',
  "use d'alembert on 1 consecutive loss",
  'use labouchere after five consecutive losses',
  "use oscar's grind after 2 consecutive wins",
  'use 1-3-2-6 after 1 consecutive win',
  'use flat betting after 2 consecutive losses',
  'martingale after 2 losses',
  'fibonacci when losses',
  "oscars grind on 3 wins",
  '1326 after 1 win',
  'dalembert after loss',
  'double the bet after 2 losses',
  'triple bet when 1 win',
  '2x stake after every 3 losses',
  '3x the wager on 1 win',
  '2.5x bet after 2 losses',
  '4 bet after 1 loss',
  'bet 2 units on player after 3 consecutive banker wins',
  'bet three on banker following 2 player losses',
  'bet 1 unit on tie when 4 consecutive banker wins',
  'bet 0 units on banker after 2 player wins',
  'bet on player after 2 banker wins',
  'wager banker after three consecutive player losses',
  'play on tie after 1 banker win',
  'bet on xyz after 2 banker wins',
  'reset progression after a win',
  'reset the bet on loss',
  'reset units when a win',
  'always bet banker',
  'flat bet on player',
  'just tie',
  'only bet on the house',
  'flat banker',
  '',
  '   ',
  'something completely different',
  'STOP LOSS ONE',
  'Take Profit 10 and stop loss 20',
]

function withoutIds(rules: Rule[]) {
  return rules.map(({ id: _id, ...r }) => r)
}

describe('parseNLRule', () => {
  it.each(sentences.map(s => [s]))('%j', async text => {
    const out = await parseNLRule(text)
    expect({ ...out, rules: withoutIds(out.rules) }).toMatchSnapshot()
  })

  it('uses the AI reply when no local pattern matches', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        content: [{
          text: '```json\n[{"label":"AI rule","trigger":{"type":"hand_count","hand_min":3},"action":{"type":"place_bet","side":"Player"}},{"nope":1}]\n```',
        }],
      },
    })
    const out = await parseNLRule('something the regexes cannot read')
    expect({ ...out, rules: withoutIds(out.rules) }).toMatchSnapshot()
  })

  it.each([
    ['not an array', '{"label":"x"}'],
    ['empty array', '[]'],
    ['not JSON', 'sorry'],
  ])('fails cleanly when the AI reply is %s', async (_name, text) => {
    vi.mocked(axios.post).mockResolvedValue({ data: { content: [{ text }] } })
    expect(await parseNLRule('something the regexes cannot read')).toMatchSnapshot()
  })
})

const triggers: Trigger[] = [
  { type: 'streak', side: 'Banker', direction: 'consecutive_wins', min_length: 1 },
  { type: 'streak', side: 'Player', direction: 'consecutive_wins', min_length: 3 },
  { type: 'streak', side: 'Any', direction: 'consecutive_losses', min_length: 1 },
  { type: 'streak', direction: 'consecutive_losses', min_length: 2 },
  { type: 'streak', side: 'Tie', direction: 'alternating', min_length: 2 },
  { type: 'streak', side: 'Banker' },
  { type: 'financial_state', condition: 'session_loss', threshold: -200 },
  { type: 'financial_state', condition: 'session_profit', threshold: 300 },
  { type: 'financial_state', condition: 'bankroll_below', threshold: 1000 },
  { type: 'financial_state', condition: 'bankroll_above', threshold: 9000 },
  { type: 'financial_state' },
  { type: 'hand_count', hand_min: 1 },
  { type: 'hand_count', hand_min: 5 },
  { type: 'hand_count' },
  { type: 'hand_count', hand_min: 10, hand_max: 40 },
  { type: 'hand_count', hand_max: 20 },
  { type: 'pattern', pattern: 'B-P-B', lookback: 6 },
  { type: 'pattern' },
  { type: 'composite', operator: 'OR' },
  { type: 'composite' },
  { type: 'statistical' },
]

const actions: Action[] = [
  { type: 'place_bet', side: 'Player', unit_size: 1 },
  { type: 'place_bet', unit_size: 3 },
  { type: 'place_bet' },
  ...(['flat', 'martingale', 'fibonacci', 'dalembert', 'labouchere', 'oscars_grind', '1326', 'multiply', 'add'] as const).map(
    method => ({ type: 'adjust_unit', method }) as Action,
  ),
  { type: 'adjust_unit', method: 'multiply', value: 3 },
  { type: 'adjust_unit', method: 'add', value: 2 },
  { type: 'adjust_unit' },
  { type: 'skip_hand', skip_count: 1 },
  { type: 'skip_hand', skip_count: 4 },
  { type: 'skip_hand' },
  { type: 'reset_progression' },
  { type: 'lock_side', side: 'Player', lock_duration: 3 },
  { type: 'lock_side' },
  { type: 'stop_loss', threshold: -150 },
  { type: 'stop_loss' },
  { type: 'take_profit', threshold: 250 },
  { type: 'take_profit' },
]

describe('ruleToSentence', () => {
  it('describes every trigger', () => {
    expect(triggers.map(t => ruleToSentence(rule('t', t, { type: 'place_bet', side: 'Banker' })))).toMatchSnapshot()
  })

  it('describes every action', () => {
    expect(actions.map(a => ruleToSentence(rule('a', { type: 'hand_count', hand_min: 1 }, a)))).toMatchSnapshot()
  })

  it('describes every parsed sentence', async () => {
    const out: string[] = []
    for (const s of sentences) {
      for (const r of (await parseNLRule(s)).rules) out.push(ruleToSentence(r))
    }
    expect(out).toMatchSnapshot()
  })
})
