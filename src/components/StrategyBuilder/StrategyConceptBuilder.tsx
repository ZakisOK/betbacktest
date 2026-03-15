import React, { useState } from 'react'
import { Sparkles, Loader2, X, CheckSquare, Square, AlertTriangle, Lightbulb, ArrowLeftRight } from 'lucide-react'
import axios from 'axios'
import { useStore } from '../../store/useStore'
import type { ConceptBuilderResponse, Rule } from '../../types'
import { ruleToSentence } from '../../utils/ruleToSentence'

// ────────────────────────────────────────────────────────────
// System prompt
// ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Baccarat betting strategy architect. Your job is to interpret a high-level strategy concept described in plain English and translate it into a concrete set of 3–6 betting rules, along with suggestions for the user to consider.

## Your Output

Return ONLY valid JSON matching this exact schema — no markdown, no explanation, no code fences:

{
  "interpretation": "<1-2 sentence plain-English summary of the strategy you are building>",
  "rules": [
    {
      "label": "<descriptive rule name>",
      "enabled": true,
      "trigger": {
        "type": "streak" | "pattern" | "financial_state" | "hand_count" | "composite",
        "side": "Banker" | "Player" | "Tie" | "Any",
        "direction": "consecutive_wins" | "consecutive_losses" | "alternating",
        "min_length": <number>,
        "pattern": "<string>",
        "lookback": <number>,
        "condition": "session_loss" | "session_profit" | "bankroll_below" | "bankroll_above",
        "threshold": <number>,
        "hand_min": <number>,
        "hand_max": <number>
      },
      "action": {
        "type": "place_bet" | "adjust_unit" | "skip_hand" | "reset_progression" | "stop_loss" | "take_profit",
        "side": "Banker" | "Player" | "Tie",
        "unit_size": <number>,
        "method": "flat" | "martingale" | "fibonacci" | "dalembert" | "labouchere" | "oscars_grind" | "1326" | "add" | "multiply",
        "value": <number>,
        "skip_count": <number>,
        "reset_to": <number>,
        "threshold": <number>
      },
      "modifiers": {
        "max_bet": <number>,
        "bankroll_guard": <number between 0-1>,
        "shoe_reset": "carry" | "reset"
      }
    }
  ],
  "suggestions": [
    {
      "type": "warning" | "consider" | "alternative",
      "text": "<actionable suggestion text>"
    }
  ]
}

## Rules for Generating Strategy Rules

1. Generate exactly 3–6 rules that coherently implement the described concept.
2. Always include at least one base betting rule (type: "place_bet" with hand_count trigger) as the default action.
3. Always include at least one protective rule (stop_loss or bankroll_guard) unless the user explicitly requests no protection.
4. If the concept mentions a progression (Martingale, Fibonacci, etc.), include an adjust_unit rule AND a reset_progression rule.
5. If the concept follows a side (Banker/Player), make all place_bet rules use that side consistently.
6. Use realistic values: bankroll_guard between 0.05–0.20, max_bet no more than 20× base, stop_loss threshold negative (e.g. -500).
7. Label rules clearly and descriptively.

## Rules for Generating Suggestions

Generate exactly 2–4 suggestions, mixing types:
- "warning": Mathematical risks. Be specific.
- "consider": Optional enhancements.
- "alternative": Different approaches with different risk profiles.

## Baccarat Math Context

- Banker win: 45.86% | EV with 5% commission: -1.06%
- Player win: 44.62% | EV: -1.24%
- Tie: 9.52% | EV with 8:1 payout: -14.36%
- No betting system eliminates the house edge. Be honest about this in warnings.`

// ────────────────────────────────────────────────────────────
// Example concepts
// ────────────────────────────────────────────────────────────

const EXAMPLES = [
  'Follow banker streaks with Martingale progression',
  'Bet Player after 3 consecutive Banker wins',
  'Conservative flat bet with stop-loss and take-profit',
  'Fibonacci on Banker with bankroll protection',
  'Follow the shoe — bet whichever side won last',
]

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

type Step = 'input' | 'loading' | 'review'

interface Props {
  onClose: () => void
}

export const StrategyConceptBuilder: React.FC<Props> = ({ onClose }) => {
  const { addRule, replaceRules, showToast } = useStore()

  const [step, setStep] = useState<Step>('input')
  const [conceptText, setConceptText] = useState('')
  const [response, setResponse] = useState<ConceptBuilderResponse | null>(null)
  const [selectedRules, setSelectedRules] = useState<boolean[]>([])
  const [error, setError] = useState<string | null>(null)

  const generateConcept = async () => {
    if (!conceptText.trim()) return
    setStep('loading')
    setError(null)
    try {
      const resp = await axios.post('/api/agent', {
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: conceptText.trim() }],
      }, { timeout: 30_000 })

      const raw: string = resp.data?.content?.[0]?.text ?? ''
      const cleaned = raw.replace(/```(?:json)?/g, '').replace(/```/g, '').trim()
      let parsed: ConceptBuilderResponse
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        throw new Error('parse_failed')
      }

      setResponse(parsed)
      setSelectedRules(parsed.rules.map(() => true))
      setStep('review')
    } catch (err) {
      const msg = (err as Error).message === 'parse_failed'
        ? 'Received unexpected response. Please try again.'
        : 'Could not connect to AI. Check that the server is running.'
      setError(msg)
      setStep('input')
    }
  }

  const applyRules = (mode: 'replace' | 'append') => {
    if (!response) return
    const toApply = response.rules.filter((_, i) => selectedRules[i])
    if (toApply.length === 0) return
    if (mode === 'replace') {
      replaceRules(toApply)
      showToast(`Replaced rules with ${toApply.length} from concept`)
    } else {
      toApply.forEach(r => addRule(r))
      showToast(`Added ${toApply.length} rules from concept`)
    }
    onClose()
  }

  const toggleRule = (i: number) =>
    setSelectedRules(s => s.map((v, idx) => idx === i ? !v : v))

  const selectedCount = selectedRules.filter(Boolean).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}>
      <div className="glass-elevated w-full max-w-xl max-h-[92vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.3)' }}>
              <Sparkles size={13} style={{ color: 'rgba(196,181,253,0.9)' }}/>
            </div>
            <div>
              <div className="text-sm font-bold text-white/90">Strategy Concept Builder</div>
              <div className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                Describe your idea — AI designs the rules
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-xl leading-none transition-colors">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 p-5">

          {/* ── Step: Input ── */}
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <div className="section-label mb-1.5">Strategy concept</div>
                <textarea
                  value={conceptText}
                  onChange={e => setConceptText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && e.metaKey && generateConcept()}
                  placeholder="Describe your strategy concept in plain English…&#10;e.g. I want to follow banker streaks and increase bets using Fibonacci, with a stop-loss at -$300"
                  rows={4}
                  className="input-glass w-full px-3 py-2.5 text-xs resize-none"
                  style={{ lineHeight: '1.6' }}
                />
              </div>

              {/* Example chips */}
              <div>
                <div className="section-label mb-1.5">Examples</div>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLES.map(ex => (
                    <button key={ex}
                      onClick={() => setConceptText(ex)}
                      className="text-[9px] px-2 py-1 rounded-md transition-colors text-left"
                      style={{ background: 'rgba(167,139,250,0.08)', color: 'rgba(196,181,253,0.7)', border: '1px solid rgba(167,139,250,0.15)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(196,181,253,1)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(196,181,253,0.7)')}
                    >{ex}</button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg text-xs"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(248,113,113,0.9)' }}>
                  <AlertTriangle size={12} className="shrink-0 mt-0.5"/>
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="btn-glass flex-1 px-4 py-2 text-sm">Cancel</button>
                <button
                  onClick={generateConcept}
                  disabled={!conceptText.trim()}
                  className="btn-primary flex-1 px-4 py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Sparkles size={12}/>Generate Strategy
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Loading ── */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 size={28} className="animate-spin" style={{ color: 'rgba(167,139,250,0.8)' }}/>
              <div className="text-center">
                <div className="text-sm font-semibold text-white/70 mb-1">Designing your strategy…</div>
                <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Claude is generating rules and suggestions
                </div>
              </div>
            </div>
          )}

          {/* ── Step: Review ── */}
          {step === 'review' && response && (
            <div className="space-y-4">

              {/* Interpretation */}
              <div className="px-3.5 py-3 rounded-xl"
                style={{ background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.2)' }}>
                <div className="text-[9px] font-mono font-bold text-teal-400/70 mb-1.5 uppercase tracking-wider">Interpretation</div>
                <p className="text-xs text-white/75 leading-relaxed">{response.interpretation}</p>
              </div>

              {/* Rules checklist */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="section-label">Generated rules</div>
                  <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {selectedCount} of {response.rules.length} selected
                  </span>
                </div>
                <div className="space-y-2">
                  {response.rules.map((rule, i) => {
                    const selected = selectedRules[i] ?? true
                    const previewRule: Rule = { ...rule, id: 'preview', priority: i + 1 }
                    return (
                      <button key={i}
                        onClick={() => toggleRule(i)}
                        className="w-full text-left px-3 py-2.5 rounded-lg transition-all"
                        style={{
                          background: selected ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${selected ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.06)'}`,
                        }}>
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 shrink-0" style={{ color: selected ? 'rgba(165,180,252,0.9)' : 'rgba(255,255,255,0.25)' }}>
                            {selected ? <CheckSquare size={13}/> : <Square size={13}/>}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold mb-0.5"
                              style={{ color: selected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)' }}>
                              {rule.label}
                            </div>
                            <div className="text-[10px] leading-snug"
                              style={{ color: selected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)' }}>
                              {ruleToSentence(previewRule)}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Suggestions */}
              {response.suggestions.length > 0 && (
                <div>
                  <div className="section-label mb-2">Suggestions</div>
                  <div className="space-y-2">
                    {response.suggestions.map((s, i) => {
                      const isWarning = s.type === 'warning'
                      const isConsider = s.type === 'consider'
                      return (
                        <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg"
                          style={{
                            background: isWarning ? 'rgba(245,158,11,0.08)' : isConsider ? 'rgba(59,130,246,0.08)' : 'rgba(100,116,139,0.1)',
                            border: `1px solid ${isWarning ? 'rgba(245,158,11,0.2)' : isConsider ? 'rgba(59,130,246,0.2)' : 'rgba(100,116,139,0.2)'}`,
                          }}>
                          {isWarning && <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5"/>}
                          {isConsider && <Lightbulb size={12} className="text-blue-400 shrink-0 mt-0.5"/>}
                          {s.type === 'alternative' && <ArrowLeftRight size={12} className="text-slate-400 shrink-0 mt-0.5"/>}
                          <p className="text-[10px] leading-relaxed"
                            style={{ color: isWarning ? 'rgba(253,230,138,0.8)' : isConsider ? 'rgba(147,197,253,0.8)' : 'rgba(203,213,225,0.7)' }}>
                            {s.text}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Action row */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => { setStep('input'); setResponse(null) }}
                  className="text-[10px] text-white/35 hover:text-white/60 transition-colors mr-auto">
                  ← Start Over
                </button>
                <button
                  onClick={() => applyRules('replace')}
                  disabled={selectedCount === 0}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: 'rgba(248,113,113,0.9)' }}>
                  Replace Rules
                </button>
                <button
                  onClick={() => applyRules('append')}
                  disabled={selectedCount === 0}
                  className="btn-primary flex-1 px-3 py-2 text-xs disabled:opacity-40 disabled:cursor-not-allowed">
                  Add to Existing
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
