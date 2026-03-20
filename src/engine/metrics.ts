/**
 * Performance Metrics Calculator
 *
 * Computes all financial and risk metrics from simulation results.
 */

import type { ShoeResult, PerformanceMetrics, SimulationConfig } from '../types'

// ────────────────────────────────────────────────────────────
// Core Financial Metrics
// ────────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function stddev(arr: number[], mu?: number): number {
  if (arr.length < 2) return 0
  const m = mu ?? mean(arr)
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1)
  return Math.sqrt(variance)
}

function downsideDeviation(arr: number[], mar = 0): number {
  const neg = arr.map((v) => Math.min(0, v - mar) ** 2)
  return Math.sqrt(neg.reduce((s, v) => s + v, 0) / Math.max(1, arr.length - 1))
}

// ────────────────────────────────────────────────────────────
// Drawdown Analysis
// ────────────────────────────────────────────────────────────

function maxDrawdownAnalysis(equityCurve: number[]): { maxDrawdown: number; maxDuration: number } {
  let peak = equityCurve[0] ?? 0
  let maxDD = 0
  let currentDrawdownStart = 0
  let maxDuration = 0
  let drawdownStarted = false

  for (let i = 0; i < equityCurve.length; i++) {
    if (equityCurve[i] > peak) {
      if (drawdownStarted) {
        maxDuration = Math.max(maxDuration, i - currentDrawdownStart)
        drawdownStarted = false
      }
      peak = equityCurve[i]
    } else {
      const dd = peak - equityCurve[i]
      if (dd > maxDD) maxDD = dd
      if (!drawdownStarted && dd > 0) {
        drawdownStarted = true
        currentDrawdownStart = i
      }
    }
  }

  if (drawdownStarted) {
    maxDuration = Math.max(maxDuration, equityCurve.length - currentDrawdownStart)
  }

  return { maxDrawdown: maxDD, maxDuration }
}

// ────────────────────────────────────────────────────────────
// Risk of Ruin (Gambler's Ruin approximation)
// ────────────────────────────────────────────────────────────

function riskOfRuin(
  winRate: number,
  avgWin: number,
  avgLoss: number,
  bankroll: number,
  baseUnit: number
): number {
  if (winRate <= 0 || winRate >= 1) return winRate >= 1 ? 0 : 1
  const p = winRate
  const q = 1 - p
  const b = Math.abs(avgWin / avgLoss)
  if (b <= 0) return 1

  // Modified gambler's ruin formula accounting for win/loss sizes
  const a = q / (p * b)
  if (a >= 1) return 1

  const n = bankroll / Math.max(baseUnit, 1)
  return Math.pow(a, n)
}

// ────────────────────────────────────────────────────────────
// Kelly Criterion
// ────────────────────────────────────────────────────────────

function kellyCriterion(winRate: number, avgWin: number, avgLoss: number): number {
  if (avgLoss === 0 || winRate <= 0) return 0
  const b = avgWin / Math.abs(avgLoss)
  const p = winRate
  const q = 1 - p
  const f = (b * p - q) / b
  return Math.max(0, f)
}

// ────────────────────────────────────────────────────────────
// Streak Analysis
// ────────────────────────────────────────────────────────────

function streakAnalysis(pnlSeries: number[]): {
  maxWin: number
  maxLoss: number
} {
  let maxWin = 0
  let maxLoss = 0
  let curWin = 0
  let curLoss = 0

  for (const pnl of pnlSeries) {
    if (pnl > 0) {
      curWin++
      curLoss = 0
      maxWin = Math.max(maxWin, curWin)
    } else if (pnl < 0) {
      curLoss++
      curWin = 0
      maxLoss = Math.max(maxLoss, curLoss)
    } else {
      // Push — breaks streak for now
      curWin = 0
      curLoss = 0
    }
  }

  return { maxWin, maxLoss }
}

// ────────────────────────────────────────────────────────────
// Main Metrics Calculator
// ────────────────────────────────────────────────────────────

export function calculateMetrics(
  shoes: ShoeResult[],
  config: SimulationConfig
): PerformanceMetrics {
  // Flatten all hands
  const allHands = shoes.flatMap((s) => s.hands)
  const bettedHands = allHands.filter((h) => !h.skipped && h.bet_amount > 0)
  const wonHands = bettedHands.filter((h) => h.pnl > 0)
  const lostHands = bettedHands.filter((h) => h.pnl < 0)

  // Outcome counts (all hands, not just betted)
  const bankerWins = allHands.filter((h) => h.outcome === 'Banker').length
  const playerWins = allHands.filter((h) => h.outcome === 'Player').length
  const ties = allHands.filter((h) => h.outcome === 'Tie').length

  // Core financial
  const totalWagered = bettedHands.reduce((s, h) => s + h.bet_amount, 0)
  const totalGrossWins = wonHands.reduce((s, h) => s + h.pnl, 0)
  const totalGrossLosses = Math.abs(lostHands.reduce((s, h) => s + h.pnl, 0))
  const netPnl = totalGrossWins - totalGrossLosses
  const roi = totalWagered > 0 ? netPnl / totalWagered : 0
  const winRate = bettedHands.length > 0 ? wonHands.length / bettedHands.length : 0
  const avgBet = bettedHands.length > 0 ? totalWagered / bettedHands.length : 0
  const profitFactor = totalGrossLosses > 0 ? totalGrossWins / totalGrossLosses : totalGrossWins > 0 ? Infinity : 0
  const evPerHand = allHands.length > 0 ? netPnl / allHands.length : 0

  // Equity curve (bankroll at end of each shoe)
  const bankrollSeries = shoes.map((s) => s.ending_bankroll)

  // Per-shoe P&L for distribution analysis
  const shoePnlSeries = shoes.map((s) => s.net_pnl)

  // Drawdown on bankroll equity curve
  const ddAnalysis = maxDrawdownAnalysis(bankrollSeries)

  // Sharpe ratio using per-shoe returns
  const shoeReturns = shoes.map((s) => s.net_pnl / Math.max(1, s.starting_bankroll))
  const meanReturn = mean(shoeReturns)
  const stdReturn = stddev(shoeReturns)
  const sharpe = stdReturn > 0 ? (meanReturn / stdReturn) * Math.sqrt(config.num_shoes) : 0

  // Sortino ratio
  const downsideDev = downsideDeviation(shoeReturns, 0)
  const sortino = downsideDev > 0 ? (meanReturn / downsideDev) * Math.sqrt(config.num_shoes) : 0

  // VaR 95% (5th percentile of shoe P&L)
  const sortedPnl = [...shoePnlSeries].sort((a, b) => a - b)
  const varIndex = Math.floor(sortedPnl.length * 0.05)
  const var95 = sortedPnl[varIndex] ?? 0

  // Risk of Ruin
  const avgWin =
    wonHands.length > 0 ? totalGrossWins / wonHands.length : 0
  const avgLoss =
    lostHands.length > 0 ? totalGrossLosses / lostHands.length : 1
  const ror = riskOfRuin(winRate, avgWin, avgLoss, config.starting_bankroll, config.starting_bankroll / 200)

  // Kelly
  const kelly = kellyCriterion(winRate, avgWin, avgLoss)

  // Bet sizing series (sample for chart — cap at 5000 points)
  const betSizes = bettedHands.slice(0, 5000).map((h) => h.bet_amount)

  // Streak analysis from hand P&L series
  const handPnlSeries = bettedHands.map((h) => h.pnl)
  const { maxWin: maxWinStreak, maxLoss: maxLossStreak } = streakAnalysis(handPnlSeries)

  // Bet side counts
  const bankerBets = bettedHands.filter((h) => h.bet_side === 'Banker').length
  const playerBets = bettedHands.filter((h) => h.bet_side === 'Player').length
  const tieBets = bettedHands.filter((h) => h.bet_side === 'Tie').length
  const skippedHands = allHands.filter((h) => h.skipped).length

  return {
    net_pnl: netPnl,
    roi,
    win_rate: winRate,
    avg_bet_size: avgBet,
    profit_factor: profitFactor,
    ev_per_hand: evPerHand,
    total_hands: allHands.length,
    total_wagered: totalWagered,
    total_wins: wonHands.length,
    total_losses: lostHands.length,

    max_drawdown: ddAnalysis.maxDrawdown,
    max_drawdown_duration: ddAnalysis.maxDuration,
    sharpe_ratio: sharpe,
    sortino_ratio: sortino,
    var_95: var95,
    risk_of_ruin: ror,
    kelly_fraction: kelly,

    shoe_pnl_series: shoePnlSeries,
    bankroll_series: bankrollSeries,
    bet_sizes: betSizes,
    winning_streak_max: maxWinStreak,
    losing_streak_max: maxLossStreak,

    banker_bet_count: bankerBets,
    player_bet_count: playerBets,
    tie_bet_count: tieBets,
    skipped_hands: skippedHands,

    banker_win_count: bankerWins,
    player_win_count: playerWins,
    tie_count: ties,
  }
}

// ────────────────────────────────────────────────────────────
// Formatting Helpers (exported for UI use)
// ────────────────────────────────────────────────────────────

export function fmtCurrency(v: number, decimals = 2): string {
  const sign = v < 0 ? '-' : v > 0 ? '+' : ''
  return `${sign}$${Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function fmtPct(v: number, decimals = 2): string {
  return `${(v * 100).toFixed(decimals)}%`
}

export function fmtNumber(v: number, decimals = 3): string {
  return v.toFixed(decimals)
}
