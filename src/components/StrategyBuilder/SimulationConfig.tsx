import React from 'react'
import type { SimulationConfig } from '../../types'

interface Props {
  config: SimulationConfig
  onChange: (updates: Partial<SimulationConfig>) => void
}

const SHOE_PRESETS = [
  { label: '1K', value: 1000 },
  { label: '10K', value: 10000 },
  { label: '100K', value: 100000 },
]

const SliderField: React.FC<{
  label: string
  value: number
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  onChange: (v: number) => void
}> = ({ label, value, min, max, step = 1, format, onChange }) => (
  <div className="mb-3">
    <div className="flex justify-between items-center mb-1">
      <label className="text-xs text-slate-400 font-mono uppercase tracking-wide">{label}</label>
      <span className="text-xs font-mono text-slate-200">{format ? format(value) : value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(+e.target.value)}
      className="w-full h-1.5 bg-surface-700 rounded-full appearance-none cursor-pointer
        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500
        [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-0"
    />
    <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
      <span>{format ? format(min) : min}</span>
      <span>{format ? format(max) : max}</span>
    </div>
  </div>
)

export const SimConfig: React.FC<Props> = ({ config, onChange }) => {
  const fmtK = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
  const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`
  const fmtDollar = (v: number) => `$${v.toLocaleString()}`

  return (
    <div className="space-y-1">
      {/* Shoe count quick presets */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs text-slate-400 font-mono uppercase tracking-wide">
            Shoes to Simulate
          </label>
          <span className="text-xs font-mono text-slate-200">{fmtK(config.num_shoes)}</span>
        </div>
        <div className="flex gap-1 mb-1">
          {SHOE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => onChange({ num_shoes: p.value })}
              className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${
                config.num_shoes === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-surface-800 text-slate-400 hover:bg-surface-700'
              }`}
            >
              {p.label}
            </button>
          ))}
          <input
            type="number"
            min={1}
            max={1000000}
            value={config.num_shoes}
            onChange={(e) => onChange({ num_shoes: Math.min(1000000, Math.max(1, +e.target.value)) })}
            className="ml-auto w-20 bg-surface-850 border border-surface-700 rounded px-2 py-0.5
              text-xs font-mono text-slate-200 text-right focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <SliderField
        label="Hands / Shoe"
        value={config.hands_per_shoe}
        min={40}
        max={85}
        onChange={(v) => onChange({ hands_per_shoe: v })}
      />

      <SliderField
        label="Commission Rate"
        value={config.commission_rate}
        min={0}
        max={0.1}
        step={0.005}
        format={fmtPct}
        onChange={(v) => onChange({ commission_rate: v })}
      />

      <SliderField
        label="Starting Bankroll"
        value={config.starting_bankroll}
        min={500}
        max={100000}
        step={500}
        format={fmtDollar}
        onChange={(v) => onChange({ starting_bankroll: v })}
      />

      <SliderField
        label="Cut Card Position"
        value={config.cut_card_position}
        min={10}
        max={20}
        onChange={(v) => onChange({ cut_card_position: v })}
      />

      {/* Selects row */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div>
          <label className="text-xs text-slate-400 font-mono uppercase tracking-wide block mb-1">
            Decks
          </label>
          <select
            value={config.deck_count}
            onChange={(e) => onChange({ deck_count: +e.target.value as 6 | 8 })}
            className="w-full bg-surface-850 border border-surface-700 rounded px-2 py-1.5 text-xs
              text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value={6}>6 Deck</option>
            <option value={8}>8 Deck</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 font-mono uppercase tracking-wide block mb-1">
            Tie Handling
          </label>
          <select
            value={config.tie_handling}
            onChange={(e) => onChange({ tie_handling: e.target.value as 'push' | 'lose' })}
            className="w-full bg-surface-850 border border-surface-700 rounded px-2 py-1.5 text-xs
              text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="push">Push (standard)</option>
            <option value="lose">Lose</option>
          </select>
        </div>
      </div>

      {/* Random seed */}
      <div className="pt-1">
        <label className="text-xs text-slate-400 font-mono uppercase tracking-wide block mb-1">
          Random Seed (blank = random)
        </label>
        <input
          type="number"
          placeholder="Auto"
          value={config.random_seed ?? ''}
          onChange={(e) =>
            onChange({ random_seed: e.target.value ? +e.target.value : undefined })
          }
          className="w-full bg-surface-850 border border-surface-700 rounded px-2 py-1.5 text-xs
            font-mono text-slate-200 focus:outline-none focus:border-blue-500"
        />
      </div>
    </div>
  )
}
