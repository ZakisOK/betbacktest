import React, { useState } from 'react'
import { Download, BarChart2, TrendingUp, Shield, RefreshCw, Clock } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { EquityCurve } from './EquityCurve'
import { PnLHistogram } from './PnLHistogram'
import { MetricsPanel } from './MetricsPanel'
import { RiskRadar } from './RiskMetrics'

type Tab = 'overview' | 'distribution' | 'risk'

const TAB_CONFIG: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <TrendingUp size={12} /> },
  { id: 'distribution', label: 'Distribution', icon: <BarChart2 size={12} /> },
  { id: 'risk', label: 'Risk Profile', icon: <Shield size={12} /> },
]

export const ResultsPanel: React.FC = () => {
  const { backtestResults, previousResults, currentStrategy, simConfig, runBacktest, isRunning } =
    useStore()
  const [tab, setTab] = useState<Tab>('overview')

  if (!backtestResults) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="text-5xl mb-4 opacity-30">📊</div>
        <h3 className="text-slate-300 font-semibold mb-2">No Results Yet</h3>
        <p className="text-slate-500 text-sm mb-6">
          Configure a strategy and click{' '}
          <span className="font-mono text-blue-400">Run Backtest</span> to see results.
        </p>
        <div className="text-left bg-surface-850 rounded-lg p-4 text-xs text-slate-400 w-full max-w-sm">
          <div className="font-mono text-slate-300 mb-2">Quick Start:</div>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li>Open the Strategy Builder panel</li>
            <li>Add rules defining your betting logic</li>
            <li>Configure simulation parameters</li>
            <li>Click Run Backtest</li>
            <li>Consult the Math Agent for analysis</li>
          </ol>
        </div>
      </div>
    )
  }

  const r = backtestResults
  const duration = r.duration_ms < 1000
    ? `${r.duration_ms.toFixed(0)}ms`
    : `${(r.duration_ms / 1000).toFixed(2)}s`

  const handleExport = () => {
    const data = {
      strategy: r.strategy_name,
      config: r.config,
      metrics: r.metrics,
      completed_at: r.completed_at,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backtest_${r.strategy_name.replace(/\s+/g, '_')}_${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-surface-700 shrink-0">
        <div className="flex items-center justify-between mb-1">
          <div>
            <span className="text-sm font-semibold text-slate-100">{r.strategy_name}</span>
            <span className="ml-2 text-xs text-slate-500">v{currentStrategy.version}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              title="Export results"
              className="p-1.5 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <Download size={13} />
            </button>
            <button
              onClick={runBacktest}
              disabled={isRunning}
              title="Re-run backtest"
              className="p-1.5 text-slate-400 hover:text-blue-400 disabled:opacity-30 transition-colors"
            >
              <RefreshCw size={13} className={isRunning ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <Clock size={9} />
            {duration}
          </span>
          <span className="font-mono">
            {r.config.num_shoes.toLocaleString()} shoes ×{' '}
            {r.config.hands_per_shoe} hands
          </span>
          <span className="font-mono">
            {(r.config.num_shoes * r.config.hands_per_shoe).toLocaleString()} hands total
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mt-2">
          {TAB_CONFIG.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors ${
                tab === t.id
                  ? 'bg-surface-700 text-slate-100'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}

          {/* Compare indicator */}
          {previousResults && (
            <div className="ml-auto flex items-center gap-1 text-[10px] text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
              vs prev
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {tab === 'overview' && (
          <div className="space-y-4">
            <EquityCurve results={r} />
            <div className="border-t border-surface-700 pt-4">
              <MetricsPanel results={r} previous={previousResults} />
            </div>
          </div>
        )}

        {tab === 'distribution' && (
          <div className="space-y-4">
            <PnLHistogram results={r} />

            {/* Shoe-level P&L heatmap (simplified as a grid) */}
            <div className="border-t border-surface-700 pt-4">
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wide mb-3">
                Shoe Results Heatmap (last 200 shoes)
              </p>
              <div className="flex flex-wrap gap-0.5">
                {r.shoes.slice(-200).map((shoe, i) => {
                  const pct = Math.max(
                    -1,
                    Math.min(1, shoe.net_pnl / (r.config.starting_bankroll * 0.1))
                  )
                  const green = Math.max(0, Math.round(pct * 100))
                  const red = Math.max(0, Math.round(-pct * 100))
                  return (
                    <div
                      key={i}
                      title={`Shoe ${shoe.shoe_number}: ${shoe.net_pnl >= 0 ? '+' : ''}$${shoe.net_pnl.toFixed(0)}`}
                      style={{
                        backgroundColor:
                          shoe.net_pnl > 0
                            ? `rgba(34, 197, 94, ${0.15 + green * 0.008})`
                            : shoe.net_pnl < 0
                            ? `rgba(239, 68, 68, ${0.15 + red * 0.008})`
                            : '#1e293b',
                      }}
                      className="w-3 h-3 rounded-sm cursor-default transition-opacity hover:opacity-80"
                    />
                  )
                })}
              </div>
              <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                <span>🟥 Loss</span>
                <span>◻ Break-even</span>
                <span>🟩 Win</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'risk' && (
          <div className="space-y-4">
            <RiskRadar results={r} previous={previousResults} />
            <div className="border-t border-surface-700 pt-4">
              {/* Risk summary table */}
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wide mb-3">
                Risk Summary
              </p>
              <div className="space-y-2">
                {[
                  {
                    label: 'Value at Risk (95%)',
                    value: `$${Math.abs(r.metrics.var_95).toFixed(2)} / shoe`,
                    note: 'Worst loss in 95% of shoes',
                    status:
                      Math.abs(r.metrics.var_95) < r.config.starting_bankroll * 0.05
                        ? 'good'
                        : Math.abs(r.metrics.var_95) < r.config.starting_bankroll * 0.15
                        ? 'warn'
                        : 'bad',
                  },
                  {
                    label: 'Risk of Ruin',
                    value: `${(r.metrics.risk_of_ruin * 100).toFixed(4)}%`,
                    note: 'Probability bankroll → $0',
                    status: r.metrics.risk_of_ruin < 0.01 ? 'good' : r.metrics.risk_of_ruin < 0.05 ? 'warn' : 'bad',
                  },
                  {
                    label: 'Maximum Drawdown',
                    value: `$${r.metrics.max_drawdown.toFixed(0)} (${((r.metrics.max_drawdown / r.config.starting_bankroll) * 100).toFixed(1)}%)`,
                    note: 'Worst peak-to-trough decline',
                    status:
                      r.metrics.max_drawdown < r.config.starting_bankroll * 0.2
                        ? 'good'
                        : r.metrics.max_drawdown < r.config.starting_bankroll * 0.4
                        ? 'warn'
                        : 'bad',
                  },
                  {
                    label: 'Drawdown Duration',
                    value: `${r.metrics.max_drawdown_duration} shoes`,
                    note: 'Longest recovery period',
                    status: r.metrics.max_drawdown_duration < 50 ? 'good' : r.metrics.max_drawdown_duration < 200 ? 'warn' : 'bad',
                  },
                  {
                    label: 'Kelly Criterion',
                    value: `${(r.metrics.kelly_fraction * 100).toFixed(3)}%`,
                    note: 'Optimal bet fraction of bankroll',
                    status:
                      r.metrics.kelly_fraction > 0.001
                        ? 'good'
                        : r.metrics.kelly_fraction > 0
                        ? 'warn'
                        : 'bad',
                  },
                  {
                    label: 'Max Loss Streak',
                    value: `${r.metrics.losing_streak_max} consecutive`,
                    note: 'Longest losing run observed',
                    status:
                      r.metrics.losing_streak_max < 10 ? 'good' : r.metrics.losing_streak_max < 20 ? 'warn' : 'bad',
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-1.5 border-b border-surface-800"
                  >
                    <div>
                      <div className="text-xs text-slate-300">{row.label}</div>
                      <div className="text-[10px] text-slate-600">{row.note}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-200">{row.value}</span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          row.status === 'good'
                            ? 'bg-green-500'
                            : row.status === 'warn'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
