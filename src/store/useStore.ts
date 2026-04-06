import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type {
  Strategy,
  Rule,
  SimulationConfig,
  BacktestResults,
  AgentMessage,
  AgentRecommendation,
  OptimizationConstraints,
  Theme,
  ToastMessage,
} from '../types'
import type { SubscriptionTier, SubscriptionStatus } from '../lib/supabase'
import { runSimulation } from '../engine/simulator'
import { sendAgentRequest } from '../agent/mathAgent'

export interface AuthUser {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  subscription_tier: SubscriptionTier
  subscription_status: SubscriptionStatus
  subscription_ends_at: string | null
  ai_queries_today: number
  lemon_subscription_id: string | null
}

const DEFAULT_STRATEGY: Strategy = {
  id: crypto.randomUUID(),
  name: 'Banker Follow Progressive',
  version: '1.0',
  base_unit: 25,
  bankroll: 5000,
  rules: [
    {
      id: crypto.randomUUID(),
      priority: 1,
      enabled: true,
      label: 'Bet Banker (default)',
      trigger: { type: 'hand_count', hand_min: 1 },
      action: { type: 'place_bet', side: 'Banker', unit_size: 1 },
      modifiers: { max_bet: 500, shoe_reset: 'reset' },
    },
    {
      id: crypto.randomUUID(),
      priority: 2,
      enabled: true,
      label: 'Double after 2 consecutive losses',
      trigger: { type: 'streak', side: 'Banker', min_length: 2, direction: 'consecutive_losses' },
      action: { type: 'adjust_unit', method: 'martingale', value: 2 },
      modifiers: { max_bet: 400, bankroll_guard: 0.1 },
    },
    {
      id: crypto.randomUUID(),
      priority: 3,
      enabled: true,
      label: 'Stop loss at -500 units',
      trigger: {
        type: 'financial_state',
        condition: 'session_loss',
        threshold: -500,
      },
      action: { type: 'stop_loss', threshold: -500 },
      modifiers: {},
    },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

const DEFAULT_SIM_CONFIG: SimulationConfig = {
  num_shoes: 1000,
  hands_per_shoe: 70,
  deck_count: 8,
  commission_rate: 0.05,
  shuffle_type: 'perfect',
  cut_card_position: 14,
  tie_handling: 'push',
  starting_bankroll: 5000,
}

interface AppStore {
  // Auth
  user: AuthUser | null
  session: Session | null
  authLoading: boolean
  showUpgradeModal: boolean
  setUser: (user: AuthUser | null) => void
  setSession: (session: Session | null) => void
  setAuthLoading: (loading: boolean) => void
  setShowUpgradeModal: (show: boolean) => void
  incrementAiQueries: () => void
  refetchProfile: () => Promise<void>
  pendingMigration: Strategy[] | null
  clearPendingMigration: () => void

  // Strategy
  currentStrategy: Strategy
  savedStrategies: Strategy[]

  // Simulation
  simConfig: SimulationConfig
  isRunning: boolean
  progress: number
  backtestResults: BacktestResults | null
  previousResults: BacktestResults | null

  // Agent
  agentMessages: AgentMessage[]
  isAgentThinking: boolean
  agentApiKeyConfigured: boolean

  // Toasts
  toasts: ToastMessage[]
  showToast: (message: string, type?: ToastMessage['type']) => void
  dismissToast: (id: string) => void

  // UI
  theme: Theme
  activePanel: 'builder' | 'results' | 'agent'

  // Strategy actions
  updateStrategyMeta: (updates: Partial<Pick<Strategy, 'name' | 'base_unit' | 'bankroll'>>) => void
  addRule: (rule: Omit<Rule, 'id' | 'priority'>) => void
  updateRule: (id: string, updates: Partial<Rule>) => void
  removeRule: (id: string) => void
  moveRule: (id: string, direction: 'up' | 'down') => void
  duplicateRule: (id: string) => void
  loadStrategy: (strategy: Strategy) => void
  saveStrategy: () => void
  deleteStrategy: (id: string) => void
  importStrategy: (json: string) => void
  replaceRules: (rules: Omit<Rule, 'id' | 'priority'>[]) => void

  // Simulation actions
  updateSimConfig: (updates: Partial<SimulationConfig>) => void
  runBacktest: () => Promise<void>
  cancelBacktest: () => void

  // Agent actions
  sendMessage: (message: string, context?: string) => Promise<void>
  runPassiveAnalysis: (results: BacktestResults) => Promise<void>
  applyRecommendation: (rec: AgentRecommendation) => void
  clearAgentMessages: () => void
  setAgentApiKey: (key: string) => void

  // UI
  setTheme: (theme: Theme) => void
  setActivePanel: (panel: 'builder' | 'results' | 'agent') => void
}

let cancelSimulation = false

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      session: null,
      authLoading: true,
      showUpgradeModal: false,

      pendingMigration: null,
      clearPendingMigration: () => set({ pendingMigration: null }),

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setAuthLoading: (authLoading) => set({ authLoading }),
      setShowUpgradeModal: (showUpgradeModal) => set({ showUpgradeModal }),

      incrementAiQueries: () =>
        set((s) => s.user ? { user: { ...s.user, ai_queries_today: s.user.ai_queries_today + 1 } } : {}),

      refetchProfile: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (profile) {
          set({
            user: {
              id: profile.id,
              email: profile.email,
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              subscription_tier: profile.subscription_tier,
              subscription_status: profile.subscription_status,
              subscription_ends_at: profile.subscription_ends_at,
              ai_queries_today: profile.ai_queries_today,
              lemon_subscription_id: profile.lemon_subscription_id,
            },
          })
        }
      },

      currentStrategy: DEFAULT_STRATEGY,
      savedStrategies: [],
      simConfig: DEFAULT_SIM_CONFIG,
      isRunning: false,
      progress: 0,
      backtestResults: null,
      previousResults: null,
      agentMessages: [],
      isAgentThinking: false,
      agentApiKeyConfigured: false,
      toasts: [],
      theme: 'dark',
      activePanel: 'builder',

      // ── Toasts ─────────────────────────────────────────────

      showToast: (message, type = 'success') => {
        const id = crypto.randomUUID()
        set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
        setTimeout(() => {
          set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
        }, 3000)
      },

      dismissToast: (id) =>
        set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

      // ── Strategy ───────────────────────────────────────────

      updateStrategyMeta: (updates) =>
        set((s) => ({
          currentStrategy: {
            ...s.currentStrategy,
            ...updates,
            updated_at: new Date().toISOString(),
          },
        })),

      addRule: (ruleData) =>
        set((s) => {
          const newRule: Rule = {
            ...ruleData,
            id: crypto.randomUUID(),
            priority: s.currentStrategy.rules.length + 1,
          }
          return {
            currentStrategy: {
              ...s.currentStrategy,
              rules: [...s.currentStrategy.rules, newRule],
              updated_at: new Date().toISOString(),
            },
          }
        }),

      updateRule: (id, updates) =>
        set((s) => ({
          currentStrategy: {
            ...s.currentStrategy,
            rules: s.currentStrategy.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
            updated_at: new Date().toISOString(),
          },
        })),

      removeRule: (id) =>
        set((s) => ({
          currentStrategy: {
            ...s.currentStrategy,
            rules: s.currentStrategy.rules
              .filter((r) => r.id !== id)
              .map((r, i) => ({ ...r, priority: i + 1 })),
            updated_at: new Date().toISOString(),
          },
        })),

      moveRule: (id, direction) =>
        set((s) => {
          const rules = [...s.currentStrategy.rules]
          const idx = rules.findIndex((r) => r.id === id)
          if (idx === -1) return s
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1
          if (swapIdx < 0 || swapIdx >= rules.length) return s
          ;[rules[idx], rules[swapIdx]] = [rules[swapIdx], rules[idx]]
          rules.forEach((r, i) => (r.priority = i + 1))
          return {
            currentStrategy: {
              ...s.currentStrategy,
              rules,
              updated_at: new Date().toISOString(),
            },
          }
        }),

      duplicateRule: (id) =>
        set((s) => {
          const rule = s.currentStrategy.rules.find((r) => r.id === id)
          if (!rule) return s
          const newRule: Rule = {
            ...rule,
            id: crypto.randomUUID(),
            label: `${rule.label} (copy)`,
            priority: s.currentStrategy.rules.length + 1,
          }
          return {
            currentStrategy: {
              ...s.currentStrategy,
              rules: [...s.currentStrategy.rules, newRule],
              updated_at: new Date().toISOString(),
            },
          }
        }),

      loadStrategy: (strategy) => set({ currentStrategy: strategy }),

      saveStrategy: () =>
        set((s) => {
          const existing = s.savedStrategies.findIndex(
            (st) => st.id === s.currentStrategy.id
          )
          const updated = [...s.savedStrategies]
          if (existing >= 0) {
            updated[existing] = s.currentStrategy
          } else {
            updated.push(s.currentStrategy)
          }
          return { savedStrategies: updated }
        }),

      deleteStrategy: (id) =>
        set((s) => ({
          savedStrategies: s.savedStrategies.filter((st) => st.id !== id),
        })),

      importStrategy: (json) => {
        try {
          const strategy = JSON.parse(json) as Strategy
          strategy.id = crypto.randomUUID()
          strategy.created_at = new Date().toISOString()
          strategy.updated_at = new Date().toISOString()
          set({ currentStrategy: strategy })
        } catch {
          console.error('Failed to import strategy JSON')
        }
      },

      replaceRules: (rulesData) =>
        set(s => ({
          currentStrategy: {
            ...s.currentStrategy,
            rules: rulesData.map((r, i) => ({
              ...r,
              id: crypto.randomUUID(),
              priority: i + 1,
            })),
            updated_at: new Date().toISOString(),
          },
        })),

      // ── Simulation ─────────────────────────────────────────

      updateSimConfig: (updates) =>
        set((s) => ({ simConfig: { ...s.simConfig, ...updates } })),

      runBacktest: async () => {
        const { currentStrategy, simConfig } = get()
        cancelSimulation = false

        set({ isRunning: true, progress: 0 })

        const start = performance.now()
        let results: BacktestResults | null = null

        try {
          results = await runSimulation(
            currentStrategy,
            simConfig,
            (progress) => {
              if (cancelSimulation) throw new Error('cancelled')
              set({ progress })
            }
          )
          results.duration_ms = performance.now() - start

          set((s) => ({
            backtestResults: results!,
            previousResults: s.backtestResults,
            isRunning: false,
            progress: 100,
            activePanel: 'results',
          }))

          // Trigger passive agent analysis
          await get().runPassiveAnalysis(results)
        } catch (err) {
          if ((err as Error).message !== 'cancelled') {
            console.error('Backtest error:', err)
          }
          set({ isRunning: false, progress: 0 })
        }
      },

      cancelBacktest: () => {
        cancelSimulation = true
        set({ isRunning: false, progress: 0 })
      },

      // ── Agent ──────────────────────────────────────────────

      sendMessage: async (message, context) => {
        const { agentMessages, currentStrategy, backtestResults } = get()

        const userMsg: AgentMessage = {
          id: crypto.randomUUID(),
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        }

        set({ agentMessages: [...agentMessages, userMsg], isAgentThinking: true })

        try {
          const response = await sendAgentRequest(
            message,
            currentStrategy,
            backtestResults,
            agentMessages,
            context
          )

          set((s) => ({
            agentMessages: [...s.agentMessages, response],
            isAgentThinking: false,
          }))
        } catch (err) {
          const errMsg: AgentMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Analysis error: ${(err as Error).message}. Running built-in mathematical analysis instead.`,
            timestamp: new Date().toISOString(),
          }
          set((s) => ({
            agentMessages: [...s.agentMessages, errMsg],
            isAgentThinking: false,
          }))
        }
      },

      runPassiveAnalysis: async (results) => {
        const { currentStrategy } = get()
        const context = 'passive_analysis'
        await get().sendMessage(
          `Analyze my backtest results. Strategy: ${currentStrategy.name}. ` +
          `Net P&L: ${results.metrics.net_pnl.toFixed(2)}, ` +
          `Win Rate: ${(results.metrics.win_rate * 100).toFixed(2)}%, ` +
          `Sharpe: ${results.metrics.sharpe_ratio.toFixed(3)}, ` +
          `Max Drawdown: ${results.metrics.max_drawdown.toFixed(2)}, ` +
          `Risk of Ruin: ${(results.metrics.risk_of_ruin * 100).toFixed(2)}%. ` +
          `Provide a complete passive analysis with findings, math, impact, and recommendations.`,
          context
        )
      },

      applyRecommendation: (rec) => {
        const { currentStrategy } = get()
        if (rec.rule_id) {
          const rule = currentStrategy.rules.find((r) => r.id === rec.rule_id)
          if (rule) {
            // Parse and apply the parameter path
            const parts = rec.parameter.split('.')
            const updated = { ...rule } as Record<string, unknown>
            let obj = updated
            for (let i = 0; i < parts.length - 1; i++) {
              obj = obj[parts[i]] as Record<string, unknown>
            }
            obj[parts[parts.length - 1]] = rec.suggested_value
            get().updateRule(rec.rule_id, updated as Partial<Rule>)
          }
        }
      },

      clearAgentMessages: () => set({ agentMessages: [] }),

      setAgentApiKey: (_key) => set({ agentApiKeyConfigured: true }),

      // ── UI ────────────────────────────────────────────────

      setTheme: (theme) => {
        set({ theme })
        document.documentElement.className = theme
      },

      setActivePanel: (panel) => set({ activePanel: panel }),
    }),
    {
      name: 'baccarat-dashboard',
      partialize: (state) => ({
        savedStrategies: state.savedStrategies,
        simConfig: state.simConfig,
        theme: state.theme,
      }),
    }
  )
)
