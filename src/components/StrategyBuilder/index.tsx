import React, { useState } from 'react'
import {
  Plus,
  Play,
  Save,
  Upload,
  Download,
  FolderOpen,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { RuleCard } from './RuleCard'
import { SimConfig } from './SimulationConfig'
import type { Rule } from '../../types'

const DEFAULT_NEW_RULE: Omit<Rule, 'id' | 'priority'> = {
  enabled: true,
  label: 'New Rule',
  trigger: { type: 'hand_count', hand_min: 1 },
  action: { type: 'place_bet', side: 'Banker', unit_size: 1 },
  modifiers: { shoe_reset: 'reset' },
}

export const StrategyBuilder: React.FC = () => {
  const {
    currentStrategy,
    simConfig,
    isRunning,
    progress,
    savedStrategies,
    updateStrategyMeta,
    addRule,
    updateRule,
    removeRule,
    moveRule,
    duplicateRule,
    updateSimConfig,
    runBacktest,
    cancelBacktest,
    saveStrategy,
    loadStrategy,
    deleteStrategy,
    importStrategy,
  } = useStore()

  const [showSimConfig, setShowSimConfig] = useState(true)
  const [showLibrary, setShowLibrary] = useState(false)
  const [editingName, setEditingName] = useState(false)

  const handleExport = () => {
    const json = JSON.stringify(currentStrategy, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentStrategy.name.replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        importStrategy(ev.target?.result as string)
      }
      reader.readAsText(file)
    }
    input.click()
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Strategy Header */}
      <div className="px-3 pt-3 pb-2 border-b border-surface-700 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          {editingName ? (
            <input
              autoFocus
              value={currentStrategy.name}
              onChange={(e) => updateStrategyMeta({ name: e.target.value })}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              className="flex-1 bg-transparent border-b border-blue-500 text-sm font-semibold text-slate-100
                focus:outline-none"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="flex-1 text-left text-sm font-semibold text-slate-100 hover:text-blue-400 transition-colors truncate"
            >
              {currentStrategy.name}
            </button>
          )}
          <div className="flex gap-1 shrink-0">
            <button
              onClick={handleImport}
              title="Import JSON"
              className="p-1 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <Upload size={14} />
            </button>
            <button
              onClick={handleExport}
              title="Export JSON"
              className="p-1 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <Download size={14} />
            </button>
            <button
              onClick={saveStrategy}
              title="Save to Library"
              className="p-1 text-slate-400 hover:text-green-400 transition-colors"
            >
              <Save size={14} />
            </button>
            <button
              onClick={() => setShowLibrary(!showLibrary)}
              title="Open Library"
              className="p-1 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <FolderOpen size={14} />
            </button>
          </div>
        </div>

        {/* Base config */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-500 font-mono uppercase block">
              Base Unit ($)
            </label>
            <input
              type="number"
              min={1}
              value={currentStrategy.base_unit}
              onChange={(e) => updateStrategyMeta({ base_unit: +e.target.value })}
              className="w-full bg-surface-850 border border-surface-700 rounded px-2 py-1 text-xs
                font-mono text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-mono uppercase block">
              Bankroll ($)
            </label>
            <input
              type="number"
              min={100}
              value={currentStrategy.bankroll}
              onChange={(e) => updateStrategyMeta({ bankroll: +e.target.value })}
              className="w-full bg-surface-850 border border-surface-700 rounded px-2 py-1 text-xs
                font-mono text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Strategy Library */}
      {showLibrary && (
        <div className="border-b border-surface-700 bg-surface-900 px-3 py-2 shrink-0 max-h-40 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wide">
              Library ({savedStrategies.length})
            </span>
            <button onClick={() => setShowLibrary(false)}>
              <X size={12} className="text-slate-500" />
            </button>
          </div>
          {savedStrategies.length === 0 ? (
            <p className="text-xs text-slate-600 italic">No saved strategies. Click Save to add one.</p>
          ) : (
            savedStrategies.map((st) => (
              <div
                key={st.id}
                className="flex items-center justify-between py-1 text-xs hover:bg-surface-800 rounded px-1"
              >
                <button
                  onClick={() => { loadStrategy(st); setShowLibrary(false) }}
                  className="flex-1 text-left text-slate-300 hover:text-slate-100 truncate"
                >
                  {st.name}
                </button>
                <button
                  onClick={() => deleteStrategy(st.id)}
                  className="text-slate-600 hover:text-red-400 ml-2"
                >
                  <X size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wide">
            Rules ({currentStrategy.rules.length})
          </span>
          <button
            onClick={() => addRule(DEFAULT_NEW_RULE)}
            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            <Plus size={12} />
            Add Rule
          </button>
        </div>

        {currentStrategy.rules.length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <div className="text-3xl mb-2">🎴</div>
            <p className="text-xs">No rules yet. Add rules to define your strategy.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentStrategy.rules.map((rule, i) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                index={i}
                total={currentStrategy.rules.length}
                onUpdate={updateRule}
                onRemove={removeRule}
                onMove={moveRule}
                onDuplicate={duplicateRule}
              />
            ))}
          </div>
        )}
      </div>

      {/* Simulation Config (collapsible) */}
      <div className="border-t border-surface-700 shrink-0">
        <button
          onClick={() => setShowSimConfig(!showSimConfig)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono
            text-slate-400 hover:text-slate-200 uppercase tracking-wide transition-colors"
        >
          <span>Simulation Config</span>
          {showSimConfig ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        {showSimConfig && (
          <div className="px-3 pb-2 max-h-72 overflow-y-auto">
            <SimConfig config={simConfig} onChange={updateSimConfig} />
          </div>
        )}
      </div>

      {/* Run Button */}
      <div className="px-3 py-2 border-t border-surface-700 shrink-0">
        {isRunning ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Loader2 size={11} className="animate-spin" />
                Simulating...
              </span>
              <span className="font-mono">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <button
              onClick={cancelBacktest}
              className="w-full py-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={runBacktest}
            disabled={currentStrategy.rules.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500
              disabled:bg-surface-700 disabled:text-slate-500 text-white text-sm font-semibold
              rounded-lg transition-colors"
          >
            <Play size={14} fill="currentColor" />
            Run Backtest
            <span className="text-xs opacity-70 font-normal">
              {simConfig.num_shoes >= 1000
                ? `${(simConfig.num_shoes / 1000).toFixed(0)}K shoes`
                : `${simConfig.num_shoes} shoes`}
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
