import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { BacktestResults } from '../../types'

interface Props {
  results: BacktestResults
}

function buildHistogram(data: number[], bins = 30) {
  if (data.length === 0) return []
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min
  if (range === 0) return [{ bin: min, count: data.length, pct: 100, mid: min }]

  const binWidth = range / bins
  const buckets = Array.from({ length: bins }, (_, i) => ({
    bin: min + i * binWidth,
    count: 0,
    pct: 0,
    mid: min + (i + 0.5) * binWidth,
  }))

  for (const v of data) {
    const idx = Math.min(bins - 1, Math.floor((v - min) / binWidth))
    buckets[idx].count++
  }

  const maxCount = Math.max(...buckets.map((b) => b.count))
  buckets.forEach((b) => (b.pct = (b.count / data.length) * 100))

  return buckets
}

const CustomTooltip: React.FC<{
  active?: boolean
  payload?: Array<{ payload: { mid: number; count: number; pct: number } }>
}> = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-surface-900 border border-surface-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className={`font-mono font-semibold mb-1 ${d.mid >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        ~${d.mid.toFixed(0)}
      </p>
      <p className="text-slate-400">{d.count.toLocaleString()} shoes</p>
      <p className="text-slate-400">{d.pct.toFixed(2)}% of total</p>
    </div>
  )
}

export const PnLHistogram: React.FC<Props> = ({ results }) => {
  const { metrics } = results

  const histogram = useMemo(() => buildHistogram(metrics.shoe_pnl_series, 40), [metrics.shoe_pnl_series])

  const pctPositive = useMemo(() => {
    const pos = metrics.shoe_pnl_series.filter((v) => v > 0).length
    return (pos / metrics.shoe_pnl_series.length) * 100
  }, [metrics.shoe_pnl_series])

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-wide">
          P&L Distribution
        </span>
        <div className="flex gap-3 text-xs">
          <span className="text-green-400 font-mono">{pctPositive.toFixed(1)}% profitable shoes</span>
          <span className="text-red-400 font-mono">{(100 - pctPositive).toFixed(1)}% losing</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={histogram} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="mid"
            tickFormatter={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}`}
            tick={{ fontSize: 9, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <ReferenceLine x={0} stroke="#475569" strokeWidth={1} />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {histogram.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.mid >= 0 ? '#22c55e' : '#ef4444'}
                fillOpacity={0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* VaR callout */}
      <div className="mt-2 flex items-center gap-4 text-xs">
        <div>
          <span className="text-slate-500">VaR 95%: </span>
          <span className="font-mono text-red-400">${metrics.var_95.toFixed(2)}/shoe</span>
        </div>
        <div>
          <span className="text-slate-500">Mean: </span>
          <span className={`font-mono ${metrics.net_pnl / results.config.num_shoes >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${(metrics.net_pnl / results.config.num_shoes).toFixed(2)}/shoe
          </span>
        </div>
      </div>
    </div>
  )
}
