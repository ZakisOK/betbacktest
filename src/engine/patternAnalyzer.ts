/**
 * Pattern Analyzer
 *
 * Scans BacktestResults for statistically consistent patterns that
 * persist across multiple shoes. Returns concrete, actionable findings
 * and strategy adjustment suggestions.
 */

import type { BacktestResults, ShoeResult, Strategy } from '../types'
import { sendAgentRequest } from '../agent/mathAgent'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface PatternFinding {
  id: string
  title: string
  description: string
  severity: 'positive' | 'neutral' | 'warning'
  metric: string
  value: string
  suggestion?: string
  ruleAdjustment?: {
    label: string
    param: string
    current: string
    recommended: string
  }
}

export interface PatternAnalysis {
  findings: PatternFinding[]
  aiInsight: string | null
  consistency_score: number   // 0–100: how consistent results are across shoes
  edge_score: number          // 0–100: how much genuine edge exists (vs variance)
  top_recommendation: string
}

// ─────────────────────────────────────────────────────────────
// Statistical helpers
// ─────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = mean(arr)
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1))
}

/** Spearman rank correlation between two equal-length arrays */
function spearman(x: number[], y: number[]): number {
  const n = x.length
  if (n < 4) return 0
  const rank = (arr: number[]) => {
    const sorted = [...arr].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
    const r = new Array(n)
    sorted.forEach((s, rank) => { r[s.i] = rank + 1 })
    return r
  }
  const rx = rank(x), ry = rank(y)
  const d2 = rx.reduce((sum, _, i) => sum + (rx[i] - ry[i]) ** 2, 0)
  return 1 - (6 * d2) / (n * (n * n - 1))
}

/** Percentage of shoes that are profitable */
function profitableShoeRate(shoes: ShoeResult[]): number {
  if (!shoes.length) return 0
  return shoes.filter(s => s.net_pnl > 0).length / shoes.length
}

/** Proportion of shoes in top/mid/bottom thirds */
function shoePositionBias(shoes: ShoeResult[]): { early: number; mid: number; late: number } {
  const third = Math.floor(shoes.length / 3)
  const early = shoes.slice(0, third)
  const mid   = shoes.slice(third, 2 * third)
  const late  = shoes.slice(2 * third)
  return {
    early: mean(early.map(s => s.net_pnl)),
    mid:   mean(mid.map(s => s.net_pnl)),
    late:  mean(late.map(s => s.net_pnl)),
  }
}

/** Rolling mean of shoe pnls (window size w) */
function rollMean(arr: number[], w: number): number[] {
  const out: number[] = []
  for (let i = w - 1; i < arr.length; i++) {
    out.push(mean(arr.slice(i - w + 1, i + 1)))
  }
  return out
}

// ─────────────────────────────────────────────────────────────
// Core analysis
// ─────────────────────────────────────────────────────────────

type Metrics = BacktestResults['metrics']
type Phase = 'early' | 'mid' | 'late'

/** top when value >= hi, middle when value >= lo, otherwise bottom */
function tiered<T>(value: number, hi: number, lo: number, top: T, middle: T, bottom: T): T {
  if (value >= hi) return top
  return value >= lo ? middle : bottom
}

function consistencyFinding(cv: number, pnlMean: number, pnlStd: number): PatternFinding {
  if (cv < 1.5) {
    return {
      id: 'consistency',
      title: 'Consistent shoe performance',
      description: `PnL coefficient of variation is ${cv.toFixed(2)} — results are relatively stable across shoes.`,
      severity: 'positive',
      metric: 'CV', value: cv.toFixed(2),
    }
  }
  const sign = pnlMean >= 0 ? '+' : ''
  return {
    id: 'consistency',
    title: 'High variance between shoes',
    description: `PnL swings ±${pnlStd.toFixed(0)} per shoe vs avg ${sign}${pnlMean.toFixed(0)}. Results are noisy — larger samples needed.`,
    severity: 'warning',
    metric: 'CV', value: cv.toFixed(2),
    suggestion: 'Run 10,000+ shoes to distinguish signal from noise.',
  }
}

function shoeWinRateFinding(shoeWinRate: number, startingBankroll: number): PatternFinding {
  const losing = shoeWinRate < 0.45
  return {
    id: 'shoe_win_rate',
    title: `${(shoeWinRate * 100).toFixed(1)}% of shoes are profitable`,
    description: tiered(shoeWinRate, 0.55, 0.45,
      'More than half of shoes end in profit — good foundation for the strategy.',
      'Near-50/50 shoe win rate — the strategy is competitive but not dominant.',
      'Fewer than 45% of shoes are profitable. The strategy may need tighter stop-loss or entry conditions.'),
    severity: tiered(shoeWinRate, 0.55, 0.45, 'positive', 'neutral', 'warning'),
    metric: 'Shoe win rate', value: `${(shoeWinRate * 100).toFixed(1)}%`,
    suggestion: losing
      ? 'Consider adding a tighter stop-loss to cut shoe losses earlier.'
      : undefined,
    ruleAdjustment: losing ? {
      label: 'Stop-loss trigger',
      param: 'threshold',
      current: `$${Math.abs(startingBankroll * 0.15).toFixed(0)}`,
      recommended: `$${Math.abs(startingBankroll * 0.08).toFixed(0)} (−8% bankroll)`,
    } : undefined,
  }
}

function bestPhase(pos: Record<Phase, number>): Phase {
  if (pos.early >= pos.mid && pos.early >= pos.late) return 'early'
  return pos.late >= pos.mid && pos.late >= pos.early ? 'late' : 'mid'
}

function worstPhase(pos: Record<Phase, number>): Phase {
  if (pos.early <= pos.mid && pos.early <= pos.late) return 'early'
  return pos.late <= pos.mid && pos.late <= pos.early ? 'late' : 'mid'
}

// Hand ranges suggested for each phase of the shoe.
const SUGGESTED_HANDS: Record<Phase, string> = { early: '30', late: '55–80', mid: '30–55' }
const RECOMMENDED_HANDS: Record<Phase, string> = { early: 'Hands 1–30', late: 'Hands 55–80', mid: 'Hands 25–55' }

function positionBiasFinding(shoes: ShoeResult[], pnlMean: number): PatternFinding | null {
  if (shoes.length < 12) return null
  const pos = shoePositionBias(shoes)
  const best = bestPhase(pos)
  const worst = worstPhase(pos)
  const bias = Math.abs((pos[best] - pos[worst]) / (Math.abs(pnlMean) || 1))
  if (bias <= 0.5) return null

  return {
    id: 'position_bias',
    title: `Strategy performs best in ${best} shoes`,
    description: `Avg PnL: Early ${pos.early.toFixed(0)}, Mid ${pos.mid.toFixed(0)}, Late ${pos.late.toFixed(0)}. Consistent bias toward ${best}-shoe performance.`,
    severity: 'neutral',
    metric: 'Shoe position bias', value: `${best} shoes`,
    suggestion: `Consider adding a hand-count trigger (hands 1–${SUGGESTED_HANDS[best]}) to focus bets during the ${best} phase.`,
    ruleAdjustment: {
      label: 'Active hand window',
      param: 'hand_min / hand_max',
      current: 'All hands',
      recommended: RECOMMENDED_HANDS[best],
    },
  }
}

function trendFinding(pnls: number[]): PatternFinding | null {
  if (pnls.length < 20) return null
  const rollW = 10
  const rolled = rollMean(pnls, rollW)
  const corr = spearman(rolled.map((_, i) => i), rolled)
  if (Math.abs(corr) <= 0.3) return null

  const improving = corr > 0
  const trend = improving ? 'improving' : 'declining'
  const outlook = improving
    ? 'warms up as the session progresses'
    : 'degrades — possibly due to bankroll erosion or streak patterns becoming unfavorable'
  return {
    id: 'trend',
    title: `Performance is ${trend} over the session`,
    description: `Spearman correlation of rolling ${rollW}-shoe PnL vs shoe index: ${corr.toFixed(2)}. The strategy ${outlook}.`,
    severity: improving ? 'positive' : 'warning',
    metric: 'Trend correlation', value: corr.toFixed(2),
    suggestion: improving
      ? undefined
      : 'Add a session stop-loss to exit when cumulative session loss exceeds a threshold.',
  }
}

function lossStreakFinding(maxLoss: number): PatternFinding | null {
  if (maxLoss < 8) return null
  return {
    id: 'loss_streak',
    title: `Max losing streak of ${maxLoss} hands observed`,
    description: `The strategy sustained ${maxLoss} consecutive losses. Check if stop-loss or skip rules are triggering early enough.`,
    severity: 'warning',
    metric: 'Max loss streak', value: `${maxLoss}`,
    suggestion: `Consider adding a rule: skip ${Math.ceil(maxLoss / 3)} hands after ${Math.ceil(maxLoss * 0.5)} consecutive losses to break the streak pattern.`,
    ruleAdjustment: {
      label: 'Loss recovery skip',
      param: 'skip_count',
      current: `Skip after ${Math.ceil(maxLoss * 0.5) + 2} losses`,
      recommended: `Skip after ${Math.ceil(maxLoss * 0.4)} losses`,
    },
  }
}

function skipRateFinding(m: Metrics): PatternFinding | null {
  const skipRate = m.total_hands > 0 ? m.skipped_hands / (m.total_hands + m.skipped_hands) : 0
  if (skipRate <= 0.4) return null
  return {
    id: 'skip_rate',
    title: `${(skipRate * 100).toFixed(0)}% of hands skipped`,
    description: `The strategy skips many hands to achieve selective betting. This is expected for win-rate optimised strategies but reduces total action.`,
    severity: 'neutral',
    metric: 'Skip rate', value: `${(skipRate * 100).toFixed(0)}%`,
  }
}

function ruinFinding(m: Metrics, startingBankroll: number): PatternFinding | null {
  if (m.risk_of_ruin <= 0.02) return null
  const severe = m.risk_of_ruin > 0.05
  const baseUnit = Math.max(1, startingBankroll * 0.002).toFixed(0)
  return {
    id: 'ruin',
    title: `${(m.risk_of_ruin * 100).toFixed(2)}% risk of ruin`,
    description: m.risk_of_ruin > 0.1
      ? 'High risk of ruin — the current bet sizing or stop-loss is too aggressive for the bankroll.'
      : 'Moderate risk of ruin. Acceptable, but consider reducing base unit or tightening stop-loss.',
    severity: severe ? 'warning' : 'neutral',
    metric: 'Risk of ruin', value: `${(m.risk_of_ruin * 100).toFixed(2)}%`,
    suggestion: severe ? `Reduce base unit to ${baseUnit} (0.2% of bankroll) or lower the stop-loss threshold.` : undefined,
  }
}

// Edge score: combines win rate, profit factor, Sharpe, shoe win rate
function edgeScore(m: Metrics, shoeWinRate: number, consistencyScore: number): number {
  return Math.round(
    tiered(m.win_rate, 0.5, 0.45, 30, 15, 0) +
    tiered(m.profit_factor, 1.2, 1, 20, 10, 0) +
    tiered(m.sharpe_ratio, 1, 0.3, 20, 10, 0) +
    tiered(shoeWinRate, 0.55, 0.48, 20, 10, 0) +
    (consistencyScore > 60 ? 10 : 0)
  )
}

function analyzeLocally(results: BacktestResults): Omit<PatternAnalysis, 'aiInsight'> {
  const shoes = results.shoes
  const m = results.metrics
  const pnls = shoes.map(s => s.net_pnl)
  const startingBankroll = results.config.starting_bankroll

  // Consistency: std dev of shoe PnL vs mean absolute PnL
  const pnlMean = mean(pnls)
  const pnlStd  = stddev(pnls)
  const cv      = pnlMean === 0 ? 999 : Math.abs(pnlStd / pnlMean)
  const consistency_score = Math.round(Math.max(0, Math.min(100, 100 - cv * 20)))
  const shoeWinRate = profitableShoeRate(shoes)

  const findings = [
    consistencyFinding(cv, pnlMean, pnlStd),
    shoeWinRateFinding(shoeWinRate, startingBankroll),
    positionBiasFinding(shoes, pnlMean),
    trendFinding(pnls),
    lossStreakFinding(m.losing_streak_max),
    skipRateFinding(m),
    ruinFinding(m, startingBankroll),
  ].filter((f): f is PatternFinding => f !== null)

  const edge_score = edgeScore(m, shoeWinRate, consistency_score)

  const fallback = m.win_rate >= 0.50
    ? 'Strategy looks solid. Consider increasing deep-shoe count to validate statistical significance.'
    : 'Run the Auto-Optimizer to search for a higher win-rate configuration.'
  const top_recommendation =
    findings.find(f => f.severity === 'warning' && f.ruleAdjustment)?.suggestion ??
    findings.find(f => f.severity === 'warning')?.suggestion ??
    fallback

  return { findings, consistency_score, edge_score, top_recommendation }
}

// ─────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────

export async function analyzePatterns(
  results: BacktestResults,
  strategy: Strategy,
  useAI = true,
): Promise<PatternAnalysis> {
  const local = analyzeLocally(results)

  let aiInsight: string | null = null

  if (useAI) {
    try {
      const findingsSummary = local.findings.map(f =>
        `• ${f.title}: ${f.description}${f.suggestion ? ' Suggestion: ' + f.suggestion : ''}`
      ).join('\n')

      const msg = await sendAgentRequest(
        `I just ran a backtest and my pattern reviewer found these statistical patterns:\n\n${findingsSummary}\n\n` +
        `Consistency score: ${local.consistency_score}/100. Edge score: ${local.edge_score}/100.\n\n` +
        `Based on these patterns, what are the 2–3 most actionable strategy adjustments I should make? ` +
        `Focus on specific rule parameter changes (trigger types, thresholds, skip counts). ` +
        `Keep your response concise — max 150 words.`,
        strategy,
        results,
        [],
      )
      aiInsight = msg.content
    } catch {
      aiInsight = null
    }
  }

  return { ...local, aiInsight }
}
