import { vi } from 'vitest'
import type { Action, Rule, SimulationConfig, Strategy, Trigger } from '../types'

// Replaces Math.random with a fixed sequence so ids and unseeded runs repeat.
export function fixRandom(seed = 1) {
  let s = seed >>> 0
  return vi.spyOn(Math, 'random').mockImplementation(() => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 2 ** 32
  })
}

// cyrb53: a short, stable fingerprint of a whole result, so a snapshot can
// pin thousands of hands without storing them.
export function fingerprint(value: unknown): string {
  const str = JSON.stringify(value)
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.codePointAt(i) ?? 0
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

export function rule(label: string, trigger: Trigger, action: Action, priority = 1, modifiers: Rule['modifiers'] = {}): Rule {
  return { id: label, priority, enabled: true, label, trigger, action, modifiers }
}

export function strategy(name: string, rules: Rule[], base_unit = 10, bankroll = 5000): Strategy {
  return {
    id: name,
    name,
    version: '1.0',
    base_unit,
    bankroll,
    rules,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

export function config(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    num_shoes: 12,
    hands_per_shoe: 80,
    deck_count: 8,
    commission_rate: 0.05,
    shuffle_type: 'imperfect',
    cut_card_position: 14,
    tie_handling: 'push',
    starting_bankroll: 5000,
    random_seed: 42,
    ...overrides,
  }
}

export const alwaysBanker = rule('Always Banker', { type: 'hand_count', hand_min: 1 }, { type: 'place_bet', side: 'Banker', unit_size: 1 })
