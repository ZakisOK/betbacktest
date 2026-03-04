import React, { useState } from 'react'
import { ChevronUp, ChevronDown, Edit3, Copy, Trash2, Eye, EyeOff } from 'lucide-react'
import type { Rule } from '../../types'
import { RuleEditor } from './RuleEditor'

interface Props {
  rule: Rule
  index: number
  total: number
  onUpdate: (id: string, updates: Partial<Rule>) => void
  onRemove: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  onDuplicate: (id: string) => void
}

function describeTrigger(trigger: Rule['trigger']): string {
  switch (trigger.type) {
    case 'streak':
      return `After ${trigger.min_length ?? '?'} consecutive ${trigger.direction?.replace('_', ' ') ?? ''} on ${trigger.side ?? 'Any'}`
    case 'pattern':
      return `Pattern: ${trigger.pattern ?? '?'} in last ${trigger.lookback ?? '?'} hands`
    case 'financial_state':
      return `When ${trigger.condition?.replace(/_/g, ' ')} ${trigger.threshold ?? ''}`
    case 'hand_count':
      return `Hands ${trigger.hand_min ?? 0}${trigger.hand_max ? `–${trigger.hand_max}` : '+'}`
    case 'composite':
      return `Composite (${trigger.operator ?? 'AND'})`
    default:
      return trigger.type
  }
}

function describeAction(action: Rule['action']): string {
  switch (action.type) {
    case 'place_bet':
      return `Bet ${action.side} × ${action.unit_size ?? 1} unit`
    case 'adjust_unit':
      return `Adjust: ${action.method ?? 'flat'} × ${action.value ?? 1}`
    case 'skip_hand':
      return `Skip ${action.skip_count ?? 1} hand(s)`
    case 'reset_progression':
      return `Reset progression`
    case 'lock_side':
      return `Lock ${action.side} for ${action.lock_duration ?? 1} hands`
    case 'stop_loss':
      return `Stop loss at $${action.threshold ?? 0}`
    case 'take_profit':
      return `Take profit at $${action.threshold ?? 0}`
    default:
      return action.type
  }
}

const SIDE_COLORS: Record<string, string> = {
  Banker: 'text-blue-400',
  Player: 'text-red-400',
  Tie: 'text-green-400',
}

export const RuleCard: React.FC<Props> = ({
  rule,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
  onDuplicate,
}) => {
  const [editing, setEditing] = useState(false)

  const triggerDesc = describeTrigger(rule.trigger)
  const actionDesc = describeAction(rule.action)
  const sideColor = SIDE_COLORS[rule.action.side ?? rule.trigger.side ?? ''] ?? 'text-slate-300'

  const actionTypeColor =
    rule.action.type === 'stop_loss' || rule.action.type === 'take_profit'
      ? 'text-yellow-400'
      : rule.action.type === 'place_bet'
      ? 'text-green-400'
      : 'text-blue-400'

  return (
    <>
      <div
        className={`group relative bg-surface-850 border rounded-lg p-3 transition-all
          ${rule.enabled ? 'border-surface-700 hover:border-surface-600' : 'border-surface-800 opacity-50'}`}
      >
        {/* Priority badge */}
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-surface-700 rounded-full flex items-center justify-center">
          <span className="text-[10px] font-mono text-slate-400">{index + 1}</span>
        </div>

        <div className="ml-3">
          {/* Header row */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-200 truncate mr-2">{rule.label}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => onUpdate(rule.id, { enabled: !rule.enabled })}
                className="p-1 text-slate-400 hover:text-slate-100 transition-colors"
                title={rule.enabled ? 'Disable rule' : 'Enable rule'}
              >
                {rule.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
              <button
                onClick={() => onMove(rule.id, 'up')}
                disabled={index === 0}
                className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronUp size={13} />
              </button>
              <button
                onClick={() => onMove(rule.id, 'down')}
                disabled={index === total - 1}
                className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30 transition-colors"
              >
                <ChevronDown size={13} />
              </button>
              <button
                onClick={() => setEditing(true)}
                className="p-1 text-slate-400 hover:text-blue-400 transition-colors"
                title="Edit rule"
              >
                <Edit3 size={13} />
              </button>
              <button
                onClick={() => onDuplicate(rule.id)}
                className="p-1 text-slate-400 hover:text-green-400 transition-colors"
                title="Duplicate"
              >
                <Copy size={13} />
              </button>
              <button
                onClick={() => onRemove(rule.id)}
                className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                title="Delete rule"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Trigger + Action summary */}
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-1.5">
              <span className="text-[10px] font-mono text-blue-400 uppercase tracking-widest pt-0.5 shrink-0 w-12">
                WHEN
              </span>
              <span className="text-xs text-slate-300">{triggerDesc}</span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="text-[10px] font-mono text-green-400 uppercase tracking-widest pt-0.5 shrink-0 w-12">
                THEN
              </span>
              <span className={`text-xs font-medium ${actionTypeColor}`}>
                {actionDesc}
              </span>
            </div>
          </div>

          {/* Modifier pills */}
          <div className="flex flex-wrap gap-1 mt-2">
            {rule.modifiers.max_bet && (
              <span className="text-[10px] bg-surface-800 border border-surface-700 text-slate-400 rounded px-1.5 py-0.5 font-mono">
                max ${rule.modifiers.max_bet}
              </span>
            )}
            {rule.modifiers.bankroll_guard && (
              <span className="text-[10px] bg-surface-800 border border-surface-700 text-slate-400 rounded px-1.5 py-0.5 font-mono">
                guard {(rule.modifiers.bankroll_guard * 100).toFixed(0)}%
              </span>
            )}
            {rule.modifiers.shoe_reset === 'reset' && (
              <span className="text-[10px] bg-surface-800 border border-surface-700 text-slate-400 rounded px-1.5 py-0.5 font-mono">
                shoe reset
              </span>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <RuleEditor
          rule={rule}
          onSave={(updates) => onUpdate(rule.id, updates)}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}
