import React from 'react'
import type { BacktestResults } from '../../types'

interface Props {
  results: BacktestResults
  previous?: BacktestResults | null
}

interface MetricProps {
  label: string
  value: string
  sub?: string
  color?: string
  delta?: number
  tooltip?: string
}

const Metric: React.FC<MetricProps> = ({ label, value, sub, color = 'text-slate-100', delta, tooltip }) => (
  <div className="bg-surface-850 rounded-lg p-2.5 hover:bg-surface-800 transition-colors" title={tooltip}>
    <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wide mb-1">{label}</div>
    <div className={`text-base font-mono font-bold ${color}`}>{value}</div>
    {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    {delta !== undefined && (
      <div className={`text-[10px] font-mono mt-0.5 ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(2)}
      </div>
    )}
  </div>
)

function pctColor(v: number, goodAbove?: number, goodBelow?: number): string {
  if (goodAbove !== undefined) return v >= goodAbove ? 'text-green-400' : 'text-red-400'
  if (goodBelow !== undefined) return v <= goodBelow ? 'text-green-400' : 'text-red-400'
  return v >= 0 ? 'text-green-400' : 'text-red-400'
}

export const MetricsPanel: React.FC<Props> = ({ results, previous }) => {
  const m = results.metrics
  const p = previous?.metrics

  const fmtDelta = (cur: number, prev: number | undefined) =>
    prev !== undefined ? cur - prev : undefined

  const netPnlColor = m.net_pnl >= 0 ? 'text-green-400' : 'text-red-400'
  const roiColor = m.roi >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div>
      {/* Core Financial */}
      <div className="mb-3">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
          Core Financial
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <Metric
            label="Net P&L"
            value={`${m.net_pnl >= 0 ? '+' : ''}$${Math.abs(m.net_pnl).toFixed(0)}`}
            color={netPnlColor}
            sub={`${results.config.num_shoes.toLocaleString()} shoes`}
            delta={fmtDelta(m.net_pnl, p?.net_pnl)}
            tooltip="Total profit/loss after commission"
          />
          <Metric
            label="ROI"
            value={`${(m.roi * 100).toFixed(3)}%`}
            color={roiColor}
            sub="of total wagered"
            delta={p ? (m.roi - p.roi) * 100 : undefined}
            tooltip="Net P&L ÷ Total wagered × 100"
          />
          <Metric
            label="Win Rate"
            value={`${(m.win_rate * 100).toFixed(2)}%`}
            color={pctColor(m.win_rate, 0.45)}
            sub={`${m.total_wins.toLocaleString()} wins`}
            tooltip="Winning hands ÷ total betted hands"
          />
          <Metric
            label="EV / Hand"
            value={`${m.ev_per_hand >= 0 ? '+' : ''}$${m.ev_per_hand.toFixed(4)}`}
            color={m.ev_per_hand >= 0 ? 'text-green-400' : 'text-red-400'}
            sub="per hand dealt"
            tooltip="Net P&L ÷ total hands"
          />
          <Metric
            label="Profit Factor"
            value={isFinite(m.profit_factor) ? m.profit_factor.toFixed(3) : '∞'}
            color={pctColor(m.profit_factor, 1.0)}
            sub="gross wins ÷ losses"
            tooltip="Ratio > 1 means profitable gross"
          />
          <Metric
            label="Avg Bet"
            value={`$${m.avg_bet_size.toFixed(2)}`}
            color="text-slate-200"
            sub="per hand"
            tooltip="Total wagered ÷ hands bet"
          />
        </div>
      </div>

      {/* Risk */}
      <div className="mb-3">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
          Risk Analysis
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <Metric
            label="Max Drawdown"
            value={`$${m.max_drawdown.toFixed(0)}`}
            color={m.max_drawdown > results.config.starting_bankroll * 0.3 ? 'text-red-400' : 'text-yellow-400'}
            sub={`${((m.max_drawdown / results.config.starting_bankroll) * 100).toFixed(1)}% of bankroll`}
            tooltip="Largest peak-to-trough decline"
          />
          <Metric
            label="DD Duration"
            value={`${m.max_drawdown_duration}`}
            color="text-slate-200"
            sub="shoes in drawdown"
            tooltip="Longest period between equity peaks"
          />
          <Metric
            label="Risk of Ruin"
            value={`${(m.risk_of_ruin * 100).toFixed(3)}%`}
            color={m.risk_of_ruin > 0.05 ? 'text-red-400' : m.risk_of_ruin > 0.01 ? 'text-yellow-400' : 'text-green-400'}
            sub="bankroll → 0"
            tooltip="Probability of losing entire bankroll"
          />
          <Metric
            label="Sharpe Ratio"
            value={m.sharpe_ratio.toFixed(3)}
            color={m.sharpe_ratio > 1 ? 'text-green-400' : m.sharpe_ratio > 0 ? 'text-yellow-400' : 'text-red-400'}
            sub="risk-adj return"
            tooltip="(Mean return - risk-free) ÷ std dev"
          />
          <Metric
            label="Sortino Ratio"
            value={m.sortino_ratio.toFixed(3)}
            color={m.sortino_ratio > 1 ? 'text-green-400' : m.sortino_ratio > 0 ? 'text-yellow-400' : 'text-red-400'}
            sub="downside risk"
            tooltip="Sharpe using only downside deviation"
          />
          <Metric
            label="Kelly %"
            value={`${(m.kelly_fraction * 100).toFixed(2)}%`}
            color="text-blue-400"
            sub="optimal fraction"
            tooltip="Kelly criterion optimal bet size"
          />
        </div>
      </div>

      {/* Distribution */}
      <div>
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
          Bet & Streak Distribution
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <Metric
            label="Max Win Streak"
            value={`${m.winning_streak_max}`}
            color="text-green-400"
            sub="consecutive wins"
          />
          <Metric
            label="Max Loss Streak"
            value={`${m.losing_streak_max}`}
            color="text-red-400"
            sub="consecutive losses"
          />
          <Metric
            label="Skipped Hands"
            value={m.skipped_hands.toLocaleString()}
            color="text-slate-400"
            sub="no bet placed"
          />
          <Metric
            label="Banker Bets"
            value={m.banker_bet_count.toLocaleString()}
            color="text-blue-400"
            sub={`${m.total_hands > 0 ? ((m.banker_bet_count / m.total_hands) * 100).toFixed(1) : 0}% of hands`}
          />
          <Metric
            label="Player Bets"
            value={m.player_bet_count.toLocaleString()}
            color="text-red-400"
            sub={`${m.total_hands > 0 ? ((m.player_bet_count / m.total_hands) * 100).toFixed(1) : 0}% of hands`}
          />
          <Metric
            label="Total Wagered"
            value={`$${(m.total_wagered / 1000).toFixed(0)}K`}
            color="text-slate-300"
            sub="gross wagered"
          />
        </div>
      </div>

      {/* Outcome distribution footer */}
      <div className="mt-3 bg-surface-850 rounded-lg p-2.5">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
          Outcome Distribution (all hands)
        </p>
        <div className="flex items-center gap-4">
          {[
            {
              label: 'Banker',
              count: m.banker_win_count,
              total: m.total_hands,
              color: 'bg-blue-500',
              textColor: 'text-blue-400',
              expected: 45.86,
            },
            {
              label: 'Player',
              count: m.player_win_count,
              total: m.total_hands,
              color: 'bg-red-500',
              textColor: 'text-red-400',
              expected: 44.62,
            },
            {
              label: 'Tie',
              count: m.tie_count,
              total: m.total_hands,
              color: 'bg-green-500',
              textColor: 'text-green-400',
              expected: 9.52,
            },
          ].map((side) => {
            const pct = m.total_hands > 0 ? (side.count / m.total_hands) * 100 : 0
            return (
              <div key={side.label} className="flex-1">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className={side.textColor}>{side.label}</span>
                  <span className="font-mono text-slate-300">{pct.toFixed(2)}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-700 rounded-full">
                  <div
                    className={`h-full ${side.color} rounded-full`}
                    style={{ width: `${Math.min(100, pct / 50 * 100)}%` }}
                  />
                </div>
                <div className="text-[9px] text-slate-600 mt-0.5">
                  exp. {side.expected}%
                  <span className={`ml-1 ${Math.abs(pct - side.expected) < 0.5 ? 'text-green-600' : 'text-yellow-600'}`}>
                    ({pct > side.expected ? '+' : ''}{(pct - side.expected).toFixed(2)}%)
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
