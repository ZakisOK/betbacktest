/**
 * ruleToSentence — converts a Rule's trigger + action into a plain-English sentence.
 * Used on RuleCards to explain what a rule does without requiring users to decode badges.
 */

import type { Rule } from '../types'

function triggerSentence(t: Rule['trigger']): string {
  switch (t.type) {
    case 'streak': {
      const side  = t.side === 'Any' ? 'any side' : t.side ?? 'any side'
      const n     = t.min_length ?? 1
      const dir   = t.direction === 'consecutive_wins'   ? `${n}+ ${side} win${n > 1 ? 's' : ''}` :
                    t.direction === 'consecutive_losses'  ? `${n}+ ${side} loss${n > 1 ? 'es' : ''}` :
                    t.direction === 'alternating'         ? `${n}+ alternating results` :
                    `${n}+ streak on ${side}`
      return `After ${dir}`
    }
    case 'financial_state': {
      const amt = Math.abs(t.threshold ?? 0)
      switch (t.condition) {
        case 'session_loss':    return `When session loss ≥ $${amt}`
        case 'session_profit':  return `When session profit ≥ $${amt}`
        case 'bankroll_below':  return `When bankroll drops below $${amt}`
        case 'bankroll_above':  return `When bankroll rises above $${amt}`
        default:                return `On financial condition`
      }
    }
    case 'hand_count': {
      if (t.hand_max) return `On hands ${t.hand_min ?? 1}–${t.hand_max}`
      return `On every hand${t.hand_min && t.hand_min > 1 ? ` from #${t.hand_min}` : ''}`
    }
    case 'pattern':
      return `When pattern "${t.pattern ?? '?'}" appears in last ${t.lookback ?? '?'} hands`
    case 'composite':
      return `When ${t.operator ?? 'all'} sub-conditions match`
    default:
      return `When triggered`
  }
}

function actionSentence(a: Rule['action']): string {
  switch (a.type) {
    case 'place_bet': {
      const units = a.unit_size ?? 1
      return `bet ${units === 1 ? '1 unit' : `${units} units`} on ${a.side ?? 'Banker'}`
    }
    case 'adjust_unit': {
      const method = a.method ?? 'flat'
      const labels: Record<string, string> = {
        flat:         'keep bet flat',
        martingale:   'double bet (Martingale)',
        fibonacci:    'step up Fibonacci',
        dalembert:    'increase 1 unit (D\'Alembert)',
        labouchere:   'follow Labouchere sequence',
        oscars_grind: 'follow Oscar\'s Grind',
        '1326':       'follow 1-3-2-6 sequence',
        multiply:     `multiply bet × ${a.value ?? 2}`,
        add:          `add ${a.value ?? 1} units to bet`,
      }
      return labels[method] ?? `adjust bet (${method})`
    }
    case 'skip_hand': {
      const n = a.skip_count ?? 1
      return `skip ${n} hand${n > 1 ? 's' : ''}`
    }
    case 'reset_progression':
      return `reset bet back to base unit`
    case 'stop_loss':
      return `stop betting for this session`
    case 'take_profit':
      return `lock in profit and stop betting`
    case 'lock_side':
      return `lock bets on ${a.side ?? 'same side'} for ${a.lock_duration ?? 1} hands`
    default:
      return a.type
  }
}

export function ruleToSentence(rule: Rule): string {
  return `${triggerSentence(rule.trigger)} → ${actionSentence(rule.action)}`
}
