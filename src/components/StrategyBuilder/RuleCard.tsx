import React, { useState } from 'react'
import { ChevronUp, ChevronDown, Edit3, Copy, Trash2, Eye, EyeOff } from 'lucide-react'
import type { Rule } from '../../types'
import { RuleEditor } from './RuleEditor'
import { ruleToSentence } from '../../utils/ruleToSentence'

const TRIGGER_COLOR: Record<string, string> = {
  streak:          'rgba(99,102,241,0.7)',
  pattern:         'rgba(168,85,247,0.7)',
  financial_state: 'rgba(245,158,11,0.7)',
  hand_count:      'rgba(59,130,246,0.7)',
  composite:       'rgba(20,184,166,0.7)',
}
const TRIGGER_LABEL: Record<string, string> = {
  streak:          'STREAK',
  pattern:         'PATTERN',
  financial_state: 'MONEY',
  hand_count:      'ALWAYS',
  composite:       'COMBO',
}
const ACTION_COLOR: Record<string, string> = {
  place_bet:         'rgba(34,197,94,0.85)',
  adjust_unit:       'rgba(96,165,250,0.85)',
  stop_loss:         'rgba(239,68,68,0.85)',
  take_profit:       'rgba(251,191,36,0.85)',
  skip_hand:         'rgba(148,163,184,0.7)',
  reset_progression: 'rgba(148,163,184,0.7)',
  lock_side:         'rgba(168,85,247,0.7)',
}
const ACTION_LABEL: Record<string, string> = {
  place_bet:         'BET',
  adjust_unit:       'RAISE',
  stop_loss:         'STOP',
  take_profit:       'CASH OUT',
  skip_hand:         'SKIP',
  reset_progression: 'RESET',
  lock_side:         'LOCK',
}

interface Props {
  rule: Rule; index: number; total: number
  onUpdate:    (id: string, u: Partial<Rule>) => void
  onRemove:    (id: string) => void
  onMove:      (id: string, d: 'up' | 'down') => void
  onDuplicate: (id: string) => void
}

export const RuleCard: React.FC<Props> = ({ rule, index, total, onUpdate, onRemove, onMove, onDuplicate }) => {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const sentence = ruleToSentence(rule)

  return (
    <>
      <div className={`rule-card group relative px-3 pt-2.5 pb-2 ${!rule.enabled ? 'opacity-40' : ''}`}>
        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <span className="text-[7px] font-mono text-white/40">{index + 1}</span>
        </div>

        <div className="ml-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-white/90 truncate mr-2 leading-tight">{rule.label}</span>
            <div className="flex items-center gap-0.5 shrink-0 transition-all">
              {confirming ? (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-white/50 mr-0.5">Delete?</span>
                  <button
                    onClick={() => { onRemove(rule.id); setConfirming(false) }}
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors"
                    style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.35)', color: 'rgba(248,113,113,0.9)' }}
                  >Yes</button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="px-1.5 py-0.5 rounded text-[9px] font-medium text-white/40 hover:text-white/70 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >Cancel</button>
                </div>
              ) : (
                <div className="rule-card-actions flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onUpdate(rule.id, { enabled: !rule.enabled })} title={rule.enabled ? 'Disable' : 'Enable'}
                    className="p-1 rounded transition-colors text-white/40 hover:text-white/80">
                    {rule.enabled ? <Eye size={11}/> : <EyeOff size={11}/>}
                  </button>
                  <button onClick={() => onMove(rule.id, 'up')} disabled={index === 0}
                    className={`p-1 rounded transition-colors ${index === 0 ? 'opacity-20 cursor-not-allowed' : 'text-white/40 hover:text-white/80'}`}>
                    <ChevronUp size={11}/>
                  </button>
                  <button onClick={() => onMove(rule.id, 'down')} disabled={index === total - 1}
                    className={`p-1 rounded transition-colors ${index === total - 1 ? 'opacity-20 cursor-not-allowed' : 'text-white/40 hover:text-white/80'}`}>
                    <ChevronDown size={11}/>
                  </button>
                  <button onClick={() => setEditing(true)} title="Edit" className="p-1 rounded transition-colors text-white/40 hover:text-blue-400"><Edit3 size={11}/></button>
                  <button onClick={() => onDuplicate(rule.id)} title="Duplicate" className="p-1 rounded transition-colors text-white/40 hover:text-emerald-400"><Copy size={11}/></button>
                  <button onClick={() => setConfirming(true)} title="Delete" className="p-1 rounded transition-colors text-white/40 hover:text-red-400"><Trash2 size={11}/></button>
                </div>
              )}
            </div>
          </div>

          {/* Plain-English sentence */}
          <p className="text-[11px] text-white/65 leading-snug mb-1.5">{sentence}</p>

          {/* Type badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: TRIGGER_COLOR[rule.trigger.type] ?? 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}>
              {TRIGGER_LABEL[rule.trigger.type] ?? rule.trigger.type.toUpperCase()}
            </span>
            <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: ACTION_COLOR[rule.action.type] ?? 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)' }}>
              {ACTION_LABEL[rule.action.type] ?? rule.action.type.toUpperCase()}
            </span>
            {rule.modifiers.max_bet && <span className="glass-tag">max ${rule.modifiers.max_bet}</span>}
            {rule.modifiers.bankroll_guard && <span className="glass-tag">guard {(rule.modifiers.bankroll_guard * 100).toFixed(0)}%</span>}
            {rule.modifiers.shoe_reset === 'reset' && <span className="glass-tag">resets each shoe</span>}
          </div>
        </div>
      </div>

      {editing && <RuleEditor rule={rule} onSave={u => onUpdate(rule.id, u)} onClose={() => setEditing(false)}/>}
    </>
  )
}
