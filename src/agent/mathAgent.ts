/**
 * AI Math Agent — Claude API Integration
 *
 * Combines Claude API for conversational intelligence with a local
 * mathematical analysis engine for offline/fallback operation.
 */

import axios from 'axios'
import type { Strategy, BacktestResults, AgentMessage } from '../types'

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

**HONESTY SCORE:** [0-100. Formula: 100 × (1 - p-value from permutation test). Low score means results are variance, not edge. Be direct.]

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
  honesty_score: number
  key_findings: string[]
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
  const maxLevels = isFinite(maxBet) ? Math.floor(Math.log2(maxBet / base)) : 10
  const bustAfterLosses = maxLevels + 1
  const progBustProb = Math.pow(pPlayer, bustAfterLosses)

  // Per-shoe attempts at a bust sequence (conservative)
  const handsPerShoe = results?.config.hands_per_shoe ?? 70
  const shoeBustRisk = 1 - Math.pow(1 - progBustProb, handsPerShoe)

  // Honesty score: simple variance test
  let honestyScore = 50
  if (results) {
    const m = results.metrics
    const totalHands = m.total_hands
    if (totalHands > 1000) {
      // Approximate p-value: if ROI is more than 2 std devs from expected EV
      const expectedROI = evBanker // dominant bet type assumed
      const stdROI = Math.sqrt(0.5 / totalHands) // approximate
      const zScore = Math.abs((m.roi - expectedROI) / stdROI)
      const pValue = 2 * (1 - normalCDF(zScore))
      honestyScore = Math.round(100 * (1 - pValue))
    }
  }

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
    honesty_score: honestyScore,
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

function formatLocalAnalysis(
  strategy: Strategy,
  results: BacktestResults | null,
  analysis: LocalAnalysis,
  userMessage: string
): string {
  const m = results?.metrics

  let content = `*[Built-in Mathematical Analysis — Connect Claude API for conversational AI]*\n\n`

  if (m) {
    content += `**FINDING:** ${
      m.net_pnl >= 0
        ? `Strategy shows net positive P&L of $${m.net_pnl.toFixed(2)} over ${results!.config.num_shoes.toLocaleString()} shoes, but this likely reflects variance rather than structural edge.`
        : `Strategy shows net negative P&L of $${Math.abs(m.net_pnl).toFixed(2)} — consistent with the theoretical house edge.`
    }\n\n`

    content += `**MATH:**\n`
    content += `• Banker EV (${((results?.config.commission_rate ?? 0.05) * 100).toFixed(0)}% commission): ${(analysis.ev_banker * 100).toFixed(4)}% per unit\n`
    content += `• Player EV: ${(analysis.ev_player * 100).toFixed(4)}% per unit\n`
    content += `• Observed ROI: ${(m.roi * 100).toFixed(4)}%\n`
    content += `• Deviation from theoretical: ${((m.roi - analysis.ev_banker) * 100).toFixed(4)}% (${m.roi > analysis.ev_banker ? 'above' : 'below'} expected)\n`
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

    if (analysis.key_findings.length > 0) {
      content += `**RECOMMENDATION:**\n`
      analysis.key_findings.forEach((f) => {
        content += `⚠ ${f}\n`
      })
      content += `\nSuggested improvements:\n`
      if (m.risk_of_ruin > 0.05) {
        content += `• Reduce base unit or add stricter bankroll guard (current guard: check modifiers)\n`
      }
      if (m.max_drawdown > (results?.config.starting_bankroll ?? 5000) * 0.3) {
        content += `• Lower stop-loss threshold to limit drawdown exposure\n`
      }
      if (m.sharpe_ratio < 0.5) {
        content += `• Consider flat betting to reduce variance while maintaining similar EV\n`
      }
    } else {
      content += `**RECOMMENDATION:** Strategy parameters appear conservative. Consider tightening stop-loss triggers and exploring lower commission variants (EZ Baccarat at 0%) to improve effective EV.\n`
    }

    content += `\n**CONFIDENCE:** ${Math.min(95, 60 + Math.floor(Math.log10(m.total_hands + 1) * 10))}/100 — Based on ${m.total_hands.toLocaleString()} hands simulated.\n\n`
    content += `**HONESTY SCORE:** ${analysis.honesty_score}/100 — ${
      analysis.honesty_score > 70
        ? 'High probability results reflect variance, not genuine edge.'
        : analysis.honesty_score > 40
        ? 'Moderate uncertainty — more simulation data needed to distinguish signal from noise.'
        : 'Low sample size — results are statistically inconclusive.'
    }`
  } else {
    content += `**FINDING:** No backtest results available. Run a backtest first to enable quantitative analysis.\n\n`
    content += `**MATH:** Theoretical Banker EV = ${(analysis.ev_banker * 100).toFixed(4)}% per unit with 5% commission. `
    content += `For Martingale with ${strategy.base_unit}-unit base: bust after ${analysis.martingale_levels_to_bust} consecutive losses.\n\n`
    content += `**RECOMMENDATION:** Run a backtest with at least 10,000 shoes for statistically meaningful results (700,000+ hands).\n\n`
    content += `**CONFIDENCE:** N/A — No simulation data available.\n\n**HONESTY SCORE:** N/A`
  }

  // Handle specific questions about strategy
  if (userMessage.toLowerCase().includes('martingale') && m) {
    content += `\n\n---\n*Martingale Analysis for ${strategy.name}:*\n`
    content += `Base unit: ${strategy.base_unit} | Starting bankroll: ${results!.config.starting_bankroll}\n`
    const levels = Math.floor(Math.log2(results!.config.starting_bankroll / strategy.base_unit))
    let exposure = 0
    for (let i = 0; i <= levels; i++) {
      exposure += strategy.base_unit * Math.pow(2, i)
    }
    content += `Levels before bankroll exhaustion: ${levels}\n`
    content += `Total exposure at bust: $${exposure.toFixed(0)}\n`
    content += `Probability of hitting bust sequence per shoe: ${((1 - Math.pow(1 - Math.pow(0.4462, levels), 70)) * 100).toFixed(3)}%`
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
  } catch (err) {
    // Fallback to built-in analysis
    const analysis = builtInAnalysis(strategy, results)
    const content = formatLocalAnalysis(strategy, results, analysis, userMessage)

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      metadata: {
        honesty_score: analysis.honesty_score,
        confidence: 70,
      },
    }
  }
}

// ────────────────────────────────────────────────────────────
// Content Parsers
// ────────────────────────────────────────────────────────────

function extractHonestyScore(content: string): number | undefined {
  const match = content.match(/HONESTY\s+SCORE[:\s*]*(\d+)/i)
  return match ? parseInt(match[1], 10) : undefined
}

function extractConfidence(content: string): number | undefined {
  const match = content.match(/CONFIDENCE[:\s*]*(\d+)/i)
  return match ? parseInt(match[1], 10) : undefined
}
