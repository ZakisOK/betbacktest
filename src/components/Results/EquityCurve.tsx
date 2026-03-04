import React, { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { BacktestResults } from '../../types'

interface Props {
  results: BacktestResults
}

const CustomTooltip: React.FC<{
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value ?? 0
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">Shoe #{label}</p>
      <p className={`font-mono font-semibold ${val >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  )
}

export const EquityCurve: React.FC<Props> = ({ results }) => {
  const { metrics, config } = results

  // Sample the bankroll series for performance (max 2000 points)
  const data = useMemo(() => {
    const series = metrics.bankroll_series
    const maxPoints = 2000
    const step = Math.max(1, Math.floor(series.length / maxPoints))
    return series
      .filter((_, i) => i % step === 0)
      .map((bankroll, i) => ({
        shoe: Math.round(i * step + 1),
        bankroll,
      }))
  }, [metrics.bankroll_series])

  const start = config.starting_bankroll
  const minVal = Math.min(...metrics.bankroll_series)
  const maxVal = Math.max(...metrics.bankroll_series)
  const isPositive = metrics.net_pnl >= 0

  // Confidence bands (±1 std dev of shoe P&L)
  const shoePnls = metrics.shoe_pnl_series
  const meanPnl = shoePnls.reduce((s, v) => s + v, 0) / shoePnls.length
  const stdPnl = Math.sqrt(
    shoePnls.reduce((s, v) => s + (v - meanPnl) ** 2, 0) / shoePnls.length
  )

  return (
    <div className="w-full">
      {/* Title row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wide">
            Equity Curve
          </span>
          <span className="ml-2 text-xs text-slate-600">
            {metrics.bankroll_series.length.toLocaleString()} shoes
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-slate-600 inline-block" />
            Starting ${start.toLocaleString()}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="5%"
                stopColor={isPositive ? '#22c55e' : '#ef4444'}
                stopOpacity={0.3}
              />
              <stop
                offset="95%"
                stopColor={isPositive ? '#22c55e' : '#ef4444'}
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

          <XAxis
            dataKey="shoe"
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v))}
            tick={{ fontSize: 10, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
          />

          <YAxis
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
            tick={{ fontSize: 10, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
            width={48}
            domain={[Math.min(minVal * 0.98, start * 0.5), maxVal * 1.02]}
          />

          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine y={start} stroke="#334155" strokeDasharray="4 4" strokeWidth={1} />

          <Area
            type="monotone"
            dataKey="bankroll"
            stroke={isPositive ? '#22c55e' : '#ef4444'}
            strokeWidth={1.5}
            fill="url(#equityGrad)"
            dot={false}
            activeDot={{ r: 3, fill: isPositive ? '#22c55e' : '#ef4444' }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Stats below chart */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        {[
          {
            label: 'Net P&L',
            value: `${metrics.net_pnl >= 0 ? '+' : ''}$${metrics.net_pnl.toFixed(0)}`,
            color: metrics.net_pnl >= 0 ? 'text-green-400' : 'text-red-400',
          },
          {
            label: 'Peak',
            value: `$${maxVal.toFixed(0)}`,
            color: 'text-slate-200',
          },
          {
            label: 'Trough',
            value: `$${minVal.toFixed(0)}`,
            color: 'text-slate-200',
          },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className={`text-sm font-mono font-semibold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-slate-600">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
