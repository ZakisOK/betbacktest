/**
 * AI Math Agent — Claude API Integration
 *
 * Combines Claude API for conversational intelligence with a local
 * mathematical analysis engine for offline/fallback operation.
 */

import axios from 'axios'
import type { Strategy, BacktestResults, AgentMessage, BetSide } from '../types'

// ────────────────────────────────────────────────────────────
// System Prompt
// ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert Baccarat mathematics agent — a specialist in probability theory, betting system analysis, and bankroll management for Baccarat. You provide rigorous mathematical analysis, not gambling advice.

## Core Baccarat Probabilities (8-deck shoe)
- Banker win: 45.86% | EV with 5% commission: -1.06% per unit
- Player win: 44.62% | EV: -1.24% per unit
- Tie: 9.52% | EV with 8:1 payout: -14.36% per unit

## Your Mandate
For any strategy submitted, you:
1. Calculate theoretical EV per rule, weighted by trigger frequency
2. Model variance and higher distribution moments
3. Calculate progression sustainability (bust probability, exposure per level)
4. Detect edge cases and failure modes
5. Propose specific parameter changes with quantified expected improvement

## Progression Mathematics (reference)
- Martingale: Level N bet = base × 2^N. After L consecutive losses, total exposure = base × (2^L - 1)
  Bust probability after K losses: p(K) = 0.4462^K (Player) or 0.4586^K (Banker)
- Fibonacci: Sequence 1,1,2,3,5,8,13,21... slower escalation than Martingale
- D'Alembert: Level N bet = base × (N+1). Linear growth — much safer than Martingale
- Labouchere: Cancel first + last on win, add their sum on loss. Complex but controllable

## Output Format
Structure EVERY response with these exact sections:

**FINDING:** [Clear statement of what the analysis reveals — no ambiguity]

**MATH:** [Formulas, probabilities, and calculations. Use exact numbers.]

**IMPACT:** [What this means for the developer's bankroll and risk profile]

**RECOMMENDATION:** [Specific parameter changes with expected improvement quantified]

**CONFIDENCE:** [0-100 score explaining statistical certainty of recommendation]

**HONESTY SCORE:** [Copy honesty_score from [BACKTEST METRICS] as N/100, or write N/A when it is absent. It is 100 × the two-sided p-value of the observed ROI against the expected return of the bets placed: N in 100 pure-chance runs of this size land at least this far from that return. A high score means nothing here but the house edge; a low score is a rare run, never an edge.]

## Critical Truth
No betting system alters the mathematical house edge. A strategy with positive backtest results over finite samples is displaying variance, not edge. Your role is to:
- Minimize effective house edge through selective betting
- Manage variance to extend playtime and reduce ruin probability
- Identify conditions where short-term positive expectation is most plausible
- Optimize the cost/entertainment ratio

Be mathematically precise. Never provide vague qualitative advice — always include formulas and specific parameter values.`

// ────────────────────────────────────────────────────────────
// Built-in Mathematical Analysis (fallback / supplement)
// ────────────────────────────────────────────────────────────

interface LocalAnalysis {
  ev_banker: number
  ev_player: number
  progression_bust_probability: number
  martingale_levels_to_bust: number
  honesty: HonestyTest | null
  key_findings: string[]
}

// Exact 8-deck outcome probabilities: they give the glossary EVs of Banker
// -1.06% (5% commission), Player -1.24% and Tie -14.36%.
const P_BANKER = 0.4585974
const P_PLAYER = 0.4462466
const P_TIE = 0.095156

// Below this many bets the normal approximation behind the score is too rough to report
const MIN_BETS_FOR_SCORE = 100

/** Honesty scores below this mark a run further from its expected return than chance usually allows */
export const RARE_RUN_SCORE = 5

interface HonestyTest {
  bets: number
  hands: number
  /** Stake-weighted expected return of the bets actually placed */
  expected_roi: number
  /** Half-width of the ROI range 95% of pure-chance runs of this size land in */
  margin: number
  /** 100 × the two-sided p-value of the observed ROI; absent when there are too few bets */
  score?: number
}

interface Moments {
  ev: number
  variance: number
}

// Return per unit staked for each outcome, as the simulator's computePnL pays it
function sideMoments(side: BetSide, commission: number, tieHandling: 'push' | 'lose'): Moments {
  const onTie = tieHandling === 'lose' ? -1 : 0
  let outcomes: Array<[probability: number, payout: number]>
  if (side === 'Banker') outcomes = [[P_BANKER, 1 - commission], [P_PLAYER, -1], [P_TIE, onTie]]
  else if (side === 'Player') outcomes = [[P_PLAYER, 1], [P_BANKER, -1], [P_TIE, onTie]]
  else outcomes = [[P_TIE, 8], [P_BANKER + P_PLAYER, -1]]
  const ev = outcomes.reduce((s, [p, x]) => s + p * x, 0)
  const variance = outcomes.reduce((s, [p, x]) => s + p * x * x, 0) - ev * ev
  return { ev, variance }
}

// Rules and progressions decide which side is bet and how much, and many hands
// carry no bet at all, so the expected return and its spread are built from
// each bet placed rather than from the hand count and the Banker EV.
function honestyTest(results: BacktestResults): HonestyTest {
  const { commission_rate, tie_handling } = results.config
  const moments: Record<BetSide, Moments> = {
    Banker: sideMoments('Banker', commission_rate, tie_handling),
    Player: sideMoments('Player', commission_rate, tie_handling),
    Tie: sideMoments('Tie', commission_rate, tie_handling),
  }

  let bets = 0
  let wagered = 0
  let expectedPnl = 0
  let pnlVariance = 0
  for (const hand of results.shoes.flatMap((s) => s.hands)) {
    if (hand.skipped || hand.bet_amount <= 0 || !hand.bet_side) continue
    const { ev, variance } = moments[hand.bet_side]
    bets++
    wagered += hand.bet_amount
    expectedPnl += hand.bet_amount * ev
    pnlVariance += hand.bet_amount ** 2 * variance
  }

  const hands = results.metrics.total_hands
  if (wagered === 0) return { bets, hands, expected_roi: 0, margin: 0 }

  const expectedRoi = expectedPnl / wagered
  const stdRoi = Math.sqrt(pnlVariance) / wagered
  const test = { bets, hands, expected_roi: expectedRoi, margin: 1.96 * stdRoi }
  if (bets < MIN_BETS_FOR_SCORE) return test

  const zScore = Math.abs(results.metrics.roi - expectedRoi) / stdRoi
  const pValue = 2 * (1 - normalCDF(zScore))
  return { ...test, score: Math.max(0, Math.round(100 * pValue)) }
}

function builtInAnalysis(strategy: Strategy, results: BacktestResults | null): LocalAnalysis {
  const commission = results?.config.commission_rate ?? 0.05

  // EV calculations
  const pBanker = 0.4586
  const pPlayer = 0.4462
  const pTie = 0.0952
  const evBanker = pBanker * (1 - commission) - pPlayer - pTie * 0
  const evPlayer = pPlayer - pBanker - pTie * 0

  // Martingale analysis
  const base = strategy.base_unit
  const maxBet = Math.max(...strategy.rules.map((r) => r.modifiers.max_bet ?? Infinity))
  const maxLevels = Number.isFinite(maxBet) ? Math.floor(Math.log2(maxBet / base)) : 10
  const bustAfterLosses = maxLevels + 1
  const progBustProb = Math.pow(pPlayer, bustAfterLosses)

  // Per-shoe attempts at a bust sequence: the hands each shoe actually dealt,
  // or a typical 8-deck shoe before any backtest has run
  const handsPerShoe = results?.shoes.length ? results.metrics.total_hands / results.shoes.length : 81
  const shoeBustRisk = 1 - Math.pow(1 - progBustProb, handsPerShoe)

  // Key findings
  const findings: string[] = []
  if (results) {
    const m = results.metrics
    if (m.risk_of_ruin > 0.05) {
      findings.push(`Risk of ruin ${(m.risk_of_ruin * 100).toFixed(2)}% exceeds 5% threshold`)
    }
    if (m.max_drawdown > strategy.bankroll * 0.3) {
      findings.push(`Max drawdown ${m.max_drawdown.toFixed(0)} exceeds 30% of starting bankroll`)
    }
    if (m.sharpe_ratio < 0) {
      findings.push(`Negative Sharpe ratio (${m.sharpe_ratio.toFixed(3)}) indicates returns below risk-free rate`)
    }
    if (m.profit_factor < 1) {
      findings.push(`Profit factor ${m.profit_factor.toFixed(3)} < 1.0 — system is net-negative`)
    }
    if (m.win_rate < 0.45) {
      findings.push(`Win rate ${(m.win_rate * 100).toFixed(2)}% below Banker probability baseline`)
    }
  }

  return {
    ev_banker: evBanker,
    ev_player: evPlayer,
    progression_bust_probability: shoeBustRisk,
    martingale_levels_to_bust: bustAfterLosses,
    honesty: results ? honestyTest(results) : null,
    key_findings: findings,
  }
}

/** Approximate standard normal CDF */
function normalCDF(z: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const sign = z < 0 ? -1 : 1
  z = Math.abs(z) / Math.sqrt(2)
  const t = 1 / (1 + p * z)
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z)
  return 0.5 * (1 + sign * y)
}

// ────────────────────────────────────────────────────────────
// Format Local Analysis as Structured Response
// ────────────────────────────────────────────────────────────

type Metrics = BacktestResults['metrics']

function percent(x: number): string {
  return `${(x * 100).toFixed(2)}%`
}

function honestyLine(test: HonestyTest): string {
  const sample = `${test.bets.toLocaleString()} bets over ${test.hands.toLocaleString()} hands`
  if (test.score === undefined) {
    if (test.bets === 0) {
      return `**HONESTY SCORE:** N/A — No bets were placed over ${test.hands.toLocaleString()} hands, so there is nothing to compare with the house edge.`
    }
    return `**HONESTY SCORE:** N/A — Only ${sample}, too few to compare with the house edge. Run more shoes.`
  }

  const expected = `the ${percent(test.expected_roi)} expected return of these bets`
  let note: string
  if (test.score < RARE_RUN_SCORE) {
    const odds = test.score === 0 ? 'fewer than 1' : `only ${test.score}`
    note = `A rare run, not an edge: ${odds} in 100 pure-chance runs of this size land this far from ${expected}. The expected value of every bet stays negative.`
  } else {
    note = `Nothing here but the house edge: ${test.score} in 100 pure-chance runs of this size land at least this far from ${expected}.`
  }
  // When chance alone swings the ROI further than the house edge itself, the run is too small to read
  if (test.margin > Math.abs(test.expected_roi)) {
    note += ` Small sample: at ${sample}, 95% of pure-chance runs land within ±${percent(test.margin)} of that return, a wider range than the house edge itself. Run more shoes before reading anything into the ROI.`
  }
  return `**HONESTY SCORE:** ${test.score}/100 — ${note}`
}

function findingLine(m: Metrics, results: BacktestResults): string {
  if (m.net_pnl >= 0) {
    return `Strategy shows net positive P&L of $${m.net_pnl.toFixed(2)} over ${results.config.num_shoes.toLocaleString()} shoes, but this likely reflects variance rather than structural edge.`
  }
  return `Strategy shows net negative P&L of $${Math.abs(m.net_pnl).toFixed(2)} — consistent with the theoretical house edge.`
}

function recommendationSection(m: Metrics, results: BacktestResults, analysis: LocalAnalysis): string {
  if (analysis.key_findings.length === 0) {
    return `**RECOMMENDATION:** Strategy parameters appear conservative. Consider tightening stop-loss triggers and exploring lower commission variants (EZ Baccarat at 0%) to improve effective EV.\n`
  }
  let content = `**RECOMMENDATION:**\n`
  for (const f of analysis.key_findings) content += `⚠ ${f}\n`
  content += `\nSuggested improvements:\n`
  if (m.risk_of_ruin > 0.05) {
    content += `• Reduce base unit or add stricter bankroll guard (current guard: check modifiers)\n`
  }
  if (m.max_drawdown > results.config.starting_bankroll * 0.3) {
    content += `• Lower stop-loss threshold to limit drawdown exposure\n`
  }
  if (m.sharpe_ratio < 0.5) {
    content += `• Consider flat betting to reduce variance while maintaining similar EV\n`
  }
  return content
}

function resultsAnalysis(m: Metrics, results: BacktestResults, analysis: LocalAnalysis): string {
  const commissionPct = (results.config.commission_rate * 100).toFixed(0)
  const direction = m.roi > analysis.ev_banker ? 'above' : 'below'
  let content = `**FINDING:** ${findingLine(m, results)}\n\n`

  content += `**MATH:**\n`
  content += `• Banker EV (${commissionPct}% commission): ${(analysis.ev_banker * 100).toFixed(4)}% per unit\n`
  content += `• Player EV: ${(analysis.ev_player * 100).toFixed(4)}% per unit\n`
  content += `• Observed ROI: ${(m.roi * 100).toFixed(4)}%\n`
  content += `• Deviation from theoretical: ${((m.roi - analysis.ev_banker) * 100).toFixed(4)}% (${direction} expected)\n`
  if (analysis.martingale_levels_to_bust < 20) {
    content += `• Progression bust threshold: ${analysis.martingale_levels_to_bust} consecutive losses\n`
    content += `• Per-shoe bust probability: ${(analysis.progression_bust_probability * 100).toFixed(3)}%\n`
  }
  content += `\n`

  content += `**IMPACT:**\n`
  content += `• Win Rate: ${(m.win_rate * 100).toFixed(2)}% | Max Drawdown: $${m.max_drawdown.toFixed(2)}\n`
  content += `• Sharpe Ratio: ${m.sharpe_ratio.toFixed(3)} | Sortino: ${m.sortino_ratio.toFixed(3)}\n`
  content += `• Risk of Ruin: ${(m.risk_of_ruin * 100).toFixed(3)}% | Kelly: ${(m.kelly_fraction * 100).toFixed(2)}%\n`
  content += `• VaR (95%): $${m.var_95.toFixed(2)} per shoe\n\n`

  content += recommendationSection(m, results, analysis)

  const confidence = Math.min(95, 60 + Math.floor(Math.log10(m.total_hands + 1) * 10))
  content += `\n**CONFIDENCE:** ${confidence}/100 — Based on ${m.total_hands.toLocaleString()} hands simulated.\n\n`
  if (analysis.honesty) content += honestyLine(analysis.honesty)
  return content
}

function noResultsAnalysis(strategy: Strategy, analysis: LocalAnalysis): string {
  let content = `**FINDING:** No backtest results available. Run a backtest first to enable quantitative analysis.\n\n`
  content += `**MATH:** Theoretical Banker EV = ${(analysis.ev_banker * 100).toFixed(4)}% per unit with 5% commission. `
  content += `For Martingale with ${strategy.base_unit}-unit base: bust after ${analysis.martingale_levels_to_bust} consecutive losses.\n\n`
  content += `**RECOMMENDATION:** Run a backtest with at least 10,000 shoes for statistically meaningful results (700,000+ hands).\n\n`
  content += `**CONFIDENCE:** N/A — No simulation data available.\n\n**HONESTY SCORE:** N/A`
  return content
}

function martingaleAnalysis(strategy: Strategy, results: BacktestResults): string {
  const bankroll = results.config.starting_bankroll
  let content = `\n\n---\n*Martingale Analysis for ${strategy.name}:*\n`
  content += `Base unit: ${strategy.base_unit} | Starting bankroll: ${bankroll}\n`
  const levels = Math.floor(Math.log2(bankroll / strategy.base_unit))
  let exposure = 0
  for (let i = 0; i <= levels; i++) {
    exposure += strategy.base_unit * Math.pow(2, i)
  }
  content += `Levels before bankroll exhaustion: ${levels}\n`
  content += `Total exposure at bust: $${exposure.toFixed(0)}\n`
  content += `Probability of hitting bust sequence per shoe: ${((1 - Math.pow(1 - Math.pow(0.4462, levels), 70)) * 100).toFixed(3)}%`
  return content
}

function formatLocalAnalysis(
  strategy: Strategy,
  results: BacktestResults | null,
  analysis: LocalAnalysis,
  userMessage: string
): string {
  let content = `*[Built-in Mathematical Analysis — Connect Claude API for conversational AI]*\n\n`
  content += results ? resultsAnalysis(results.metrics, results, analysis) : noResultsAnalysis(strategy, analysis)

  // Handle specific questions about strategy
  if (results && userMessage.toLowerCase().includes('martingale')) {
    content += martingaleAnalysis(strategy, results)
  }

  return content
}

// ────────────────────────────────────────────────────────────
// Main Agent Request Handler
// ────────────────────────────────────────────────────────────

export async function sendAgentRequest(
  userMessage: string,
  strategy: Strategy,
  results: BacktestResults | null,
  history: AgentMessage[],
  context?: string
): Promise<AgentMessage> {
  // Build context-rich message
  const strategyContext = JSON.stringify({
    name: strategy.name,
    base_unit: strategy.base_unit,
    bankroll: strategy.bankroll,
    rules: strategy.rules.map((r) => ({
      label: r.label,
      trigger: r.trigger,
      action: r.action,
      modifiers: r.modifiers,
    })),
  })

  const analysis = builtInAnalysis(strategy, results)

  const metricsContext = results
    ? JSON.stringify({
        shoes: results.config.num_shoes,
        net_pnl: results.metrics.net_pnl,
        roi: results.metrics.roi,
        win_rate: results.metrics.win_rate,
        sharpe: results.metrics.sharpe_ratio,
        sortino: results.metrics.sortino_ratio,
        max_drawdown: results.metrics.max_drawdown,
        risk_of_ruin: results.metrics.risk_of_ruin,
        kelly: results.metrics.kelly_fraction,
        var_95: results.metrics.var_95,
        profit_factor: results.metrics.profit_factor,
        total_hands: results.metrics.total_hands,
        banker_bets: results.metrics.banker_bet_count,
        player_bets: results.metrics.player_bet_count,
        honesty_score: analysis.honesty?.score,
      })
    : 'No backtest run yet'

  const enrichedMessage = `${userMessage}

[STRATEGY CONFIG]: ${strategyContext}
[BACKTEST METRICS]: ${metricsContext}`

  // Try Claude API
  try {
    const conversationHistory = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10) // last 5 exchanges
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    conversationHistory.push({ role: 'user', content: enrichedMessage })

    const response = await axios.post(
      '/api/agent',
      {
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: conversationHistory,
      },
      { timeout: 30000 }
    )

    const content =
      response.data?.content?.[0]?.text ?? 'No response from agent.'

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      metadata: {
        honesty_score: extractHonestyScore(content),
        confidence: extractConfidence(content),
      },
    }
  } catch {
    // The API is unreachable or failed: fall back to the built-in analysis.
    const content = formatLocalAnalysis(strategy, results, analysis, userMessage)

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      metadata: {
        honesty_score: analysis.honesty?.score,
        confidence: 70,
      },
    }
  }
}

// ────────────────────────────────────────────────────────────
// Content Parsers
// ────────────────────────────────────────────────────────────

function extractHonestyScore(content: string): number | undefined {
  const match = /HONESTY\s+SCORE[:\s*]*(\d+)/i.exec(content)
  return match ? Number.parseInt(match[1], 10) : undefined
}

function extractConfidence(content: string): number | undefined {
  const match = /CONFIDENCE[:\s*]*(\d+)/i.exec(content)
  return match ? Number.parseInt(match[1], 10) : undefined
}
