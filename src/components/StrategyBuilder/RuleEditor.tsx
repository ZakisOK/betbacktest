import React, { useState } from 'react'
import type { Rule, Trigger, Action, Modifiers, BetSide, ProgressionMethod } from '../../types'

interface Props {
  rule: Rule
  onSave: (updates: Partial<Rule>) => void
  onClose: () => void
}

const TRIGGER_TYPES = [
  { value: 'streak', label: 'Streak Detection' },
  { value: 'pattern', label: 'Pattern Match' },
  { value: 'financial_state', label: 'Financial State' },
  { value: 'hand_count', label: 'Hand Count' },
  { value: 'composite', label: 'Composite (AND/OR)' },
]

const ACTION_TYPES = [
  { value: 'place_bet', label: 'Place Bet' },
  { value: 'adjust_unit', label: 'Adjust Unit Size' },
  { value: 'skip_hand', label: 'Skip Hand(s)' },
  { value: 'reset_progression', label: 'Reset Progression' },
  { value: 'lock_side', label: 'Lock Betting Side' },
  { value: 'stop_loss', label: 'Stop Loss' },
  { value: 'take_profit', label: 'Take Profit' },
]

const PROGRESSIONS: { value: ProgressionMethod; label: string }[] = [
  { value: 'flat', label: 'Flat' },
  { value: 'martingale', label: 'Martingale' },
  { value: 'fibonacci', label: 'Fibonacci' },
  { value: 'dalembert', label: "D'Alembert" },
  { value: 'labouchere', label: 'Labouchere' },
  { value: 'oscars_grind', label: "Oscar's Grind" },
  { value: '1326', label: '1-3-2-6' },
]

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full bg-surface-850 border border-surface-700 rounded px-2 py-1.5 text-sm text-slate-100
      focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${props.className ?? ''}`}
  />
)

const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ children, ...props }) => (
  <select
    {...props}
    className={`w-full bg-surface-850 border border-surface-700 rounded px-2 py-1.5 text-sm text-slate-100
      focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${props.className ?? ''}`}
  >
    {children}
  </select>
)

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-xs text-slate-400 mb-1 font-mono uppercase tracking-wide">
    {children}
  </label>
)

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="mb-3">
    <Label>{label}</Label>
    {children}
  </div>
)

export const RuleEditor: React.FC<Props> = ({ rule, onSave, onClose }) => {
  const [label, setLabel] = useState(rule.label)
  const [trigger, setTrigger] = useState<Trigger>({ ...rule.trigger })
  const [action, setAction] = useState<Action>({ ...rule.action })
  const [modifiers, setModifiers] = useState<Modifiers>({ ...rule.modifiers })

  const updateTrigger = (updates: Partial<Trigger>) => setTrigger((t) => ({ ...t, ...updates }))
  const updateAction = (updates: Partial<Action>) => setAction((a) => ({ ...a, ...updates }))
  const updateModifiers = (updates: Partial<Modifiers>) =>
    setModifiers((m) => ({ ...m, ...updates }))

  const handleSave = () => {
    onSave({ label, trigger, action, modifiers })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700">
          <h3 className="font-semibold text-slate-100">Edit Rule</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Label */}
          <Field label="Rule Label">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Descriptive name..." />
          </Field>

          {/* Trigger Section */}
          <div className="bg-surface-850 rounded-lg p-3">
            <p className="text-xs font-mono text-blue-400 uppercase tracking-widest mb-3">
              WHEN (Trigger)
            </p>

            <Field label="Trigger Type">
              <Select
                value={trigger.type}
                onChange={(e) => updateTrigger({ type: e.target.value as Trigger['type'] })}
              >
                {TRIGGER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>

            {trigger.type === 'streak' && (
              <>
                <Field label="Side">
                  <Select
                    value={trigger.side ?? 'Banker'}
                    onChange={(e) => updateTrigger({ side: e.target.value as BetSide })}
                  >
                    <option value="Banker">Banker</option>
                    <option value="Player">Player</option>
                    <option value="Tie">Tie</option>
                    <option value="Any">Any</option>
                  </Select>
                </Field>
                <Field label="Direction">
                  <Select
                    value={trigger.direction ?? 'consecutive_wins'}
                    onChange={(e) => updateTrigger({ direction: e.target.value as Trigger['direction'] })}
                  >
                    <option value="consecutive_wins">Consecutive Wins</option>
                    <option value="consecutive_losses">Consecutive Losses</option>
                    <option value="alternating">Alternating</option>
                  </Select>
                </Field>
                <Field label="Minimum Length">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={trigger.min_length ?? 2}
                    onChange={(e) => updateTrigger({ min_length: +e.target.value })}
                  />
                </Field>
              </>
            )}

            {trigger.type === 'pattern' && (
              <>
                <Field label="Pattern (e.g. B-P-B-P)">
                  <Input
                    value={trigger.pattern ?? ''}
                    onChange={(e) => updateTrigger({ pattern: e.target.value })}
                    placeholder="B-P-B-P"
                  />
                </Field>
                <Field label="Lookback Window (hands)">
                  <Input
                    type="number"
                    min={2}
                    max={50}
                    value={trigger.lookback ?? 8}
                    onChange={(e) => updateTrigger({ lookback: +e.target.value })}
                  />
                </Field>
              </>
            )}

            {trigger.type === 'financial_state' && (
              <>
                <Field label="Condition">
                  <Select
                    value={trigger.condition ?? 'session_loss'}
                    onChange={(e) => updateTrigger({ condition: e.target.value as Trigger['condition'] })}
                  >
                    <option value="session_loss">Session Loss ≤</option>
                    <option value="session_profit">Session Profit ≥</option>
                    <option value="bankroll_below">Bankroll Below</option>
                    <option value="bankroll_above">Bankroll Above</option>
                  </Select>
                </Field>
                <Field label="Threshold ($)">
                  <Input
                    type="number"
                    value={trigger.threshold ?? -500}
                    onChange={(e) => updateTrigger({ threshold: +e.target.value })}
                  />
                </Field>
              </>
            )}

            {trigger.type === 'hand_count' && (
              <>
                <Field label="Hand Min">
                  <Input
                    type="number"
                    min={0}
                    value={trigger.hand_min ?? 1}
                    onChange={(e) => updateTrigger({ hand_min: +e.target.value })}
                  />
                </Field>
                <Field label="Hand Max (blank = unlimited)">
                  <Input
                    type="number"
                    min={0}
                    value={trigger.hand_max ?? ''}
                    onChange={(e) =>
                      updateTrigger({ hand_max: e.target.value ? +e.target.value : undefined })
                    }
                  />
                </Field>
              </>
            )}
          </div>

          {/* Action Section */}
          <div className="bg-surface-850 rounded-lg p-3">
            <p className="text-xs font-mono text-green-400 uppercase tracking-widest mb-3">
              THEN (Action)
            </p>

            <Field label="Action Type">
              <Select
                value={action.type}
                onChange={(e) => updateAction({ type: e.target.value as Action['type'] })}
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>

            {(action.type === 'place_bet') && (
              <>
                <Field label="Bet Side">
                  <Select
                    value={action.side ?? 'Banker'}
                    onChange={(e) => updateAction({ side: e.target.value as BetSide })}
                  >
                    <option value="Banker">Banker</option>
                    <option value="Player">Player</option>
                    <option value="Tie">Tie</option>
                  </Select>
                </Field>
                <Field label="Unit Multiplier">
                  <Input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={action.unit_size ?? 1}
                    onChange={(e) => updateAction({ unit_size: +e.target.value })}
                  />
                </Field>
              </>
            )}

            {action.type === 'adjust_unit' && (
              <>
                <Field label="Progression Method">
                  <Select
                    value={action.method ?? 'martingale'}
                    onChange={(e) => updateAction({ method: e.target.value as ProgressionMethod })}
                  >
                    {PROGRESSIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Multiplier / Value">
                  <Input
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={action.value ?? 2}
                    onChange={(e) => updateAction({ value: +e.target.value })}
                  />
                </Field>
              </>
            )}

            {action.type === 'skip_hand' && (
              <Field label="Skip Count">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={action.skip_count ?? 1}
                  onChange={(e) => updateAction({ skip_count: +e.target.value })}
                />
              </Field>
            )}

            {(action.type === 'stop_loss' || action.type === 'take_profit') && (
              <Field label="Threshold ($)">
                <Input
                  type="number"
                  value={action.threshold ?? (action.type === 'stop_loss' ? -500 : 500)}
                  onChange={(e) => updateAction({ threshold: +e.target.value })}
                />
              </Field>
            )}
          </div>

          {/* Modifiers Section */}
          <div className="bg-surface-850 rounded-lg p-3">
            <p className="text-xs font-mono text-yellow-400 uppercase tracking-widest mb-3">
              WITH (Modifiers)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max Bet ($)">
                <Input
                  type="number"
                  min={0}
                  value={modifiers.max_bet ?? ''}
                  placeholder="None"
                  onChange={(e) =>
                    updateModifiers({ max_bet: e.target.value ? +e.target.value : undefined })
                  }
                />
              </Field>
              <Field label="Bankroll Guard (%)">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={modifiers.bankroll_guard ? modifiers.bankroll_guard * 100 : ''}
                  placeholder="None"
                  onChange={(e) =>
                    updateModifiers({
                      bankroll_guard: e.target.value ? +e.target.value / 100 : undefined,
                    })
                  }
                />
              </Field>
              <Field label="Commission Override (%)">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={modifiers.commission_override != null ? modifiers.commission_override * 100 : ''}
                  placeholder="Use global"
                  onChange={(e) =>
                    updateModifiers({
                      commission_override: e.target.value ? +e.target.value / 100 : undefined,
                    })
                  }
                />
              </Field>
              <Field label="Shoe Reset">
                <Select
                  value={modifiers.shoe_reset ?? 'carry'}
                  onChange={(e) =>
                    updateModifiers({ shoe_reset: e.target.value as 'carry' | 'reset' })
                  }
                >
                  <option value="carry">Carry Across Shoes</option>
                  <option value="reset">Reset Each Shoe</option>
                </Select>
              </Field>
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-surface-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-surface-800 hover:bg-surface-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Save Rule
          </button>
        </div>
      </div>
    </div>
  )
}
