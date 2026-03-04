// ============================================================
// Baccarat Strategy Dashboard — Type Definitions
// ============================================================

export type BetSide = 'Banker' | 'Player' | 'Tie'
export type HandOutcome = 'Banker' | 'Player' | 'Tie'

// ────────────────────────────────────────────────────────────
// Strategy Configuration
// ────────────────────────────────────────────────────────────

export type TriggerType =
  | 'streak'
  | 'pattern'
  | 'financial_state'
  | 'hand_count'
  | 'statistical'
  | 'composite'

export type StreakDirection = 'consecutive_wins' | 'consecutive_losses' | 'alternating'
export type FinancialCondition =
  | 'session_loss'
  | 'session_profit'
  | 'bankroll_below'
  | 'bankroll_above'
export type ShoePosition = 'early' | 'mid' | 'late'
export type CompositeOperator = 'AND' | 'OR'

export interface Trigger {
  type: TriggerType
  // streak
  side?: BetSide | 'Any'
  min_length?: number
  direction?: StreakDirection
  // pattern
  pattern?: string
  lookback?: number
  // financial_state
  condition?: FinancialCondition
  threshold?: number
  // hand_count
  hand_min?: number
  hand_max?: number
  shoe_position?: ShoePosition
  // statistical deviation
  deviation_sigma?: number
  // composite
  operator?: CompositeOperator
  sub_triggers?: Trigger[]
}

export type ActionType =
  | 'place_bet'
  | 'adjust_unit'
  | 'skip_hand'
  | 'reset_progression'
  | 'lock_side'
  | 'stop_loss'
  | 'take_profit'

export type ProgressionMethod =
  | 'flat'
  | 'multiply'
  | 'add'
  | 'martingale'
  | 'fibonacci'
  | 'dalembert'
  | 'labouchere'
  | 'oscars_grind'
  | '1326'

export interface Action {
  type: ActionType
  side?: BetSide
  unit_size?: number
  method?: ProgressionMethod
  value?: number
  skip_count?: number
  reset_to?: number
  lock_duration?: number
  threshold?: number
  labouchere_sequence?: number[]
}

export interface Modifiers {
  max_bet?: number
  bankroll_guard?: number
  time_decay?: number
  commission_override?: number
  shoe_reset?: 'carry' | 'reset'
}

export interface Rule {
  id: string
  priority: number
  enabled: boolean
  label: string
  trigger: Trigger
  action: Action
  modifiers: Modifiers
}

export interface Strategy {
  id: string
  name: string
  version: string
  base_unit: number
  bankroll: number
  rules: Rule[]
  created_at: string
  updated_at: string
}

// ────────────────────────────────────────────────────────────
// Simulation Configuration
// ────────────────────────────────────────────────────────────

export interface SimulationConfig {
  num_shoes: number
  hands_per_shoe: number
  deck_count: 6 | 8
  commission_rate: number
  shuffle_type: 'perfect' | 'imperfect'
  cut_card_position: number
  tie_handling: 'push' | 'lose'
  starting_bankroll: number
  random_seed?: number
}

// ────────────────────────────────────────────────────────────
// Simulation Results
// ────────────────────────────────────────────────────────────

export interface HandResult {
  hand_number: number
  outcome: HandOutcome
  player_value: number
  banker_value: number
  bet_side?: BetSide
  bet_amount: number
  pnl: number
  bankroll: number
  skipped: boolean
  is_natural: boolean
}

export interface ShoeResult {
  shoe_number: number
  sequence: ('B' | 'P' | 'T')[]
  hands: HandResult[]
  net_pnl: number
  starting_bankroll: number
  ending_bankroll: number
  hands_played: number
}

export interface PerformanceMetrics {
  // Core financial
  net_pnl: number
  roi: number
  win_rate: number
  avg_bet_size: number
  profit_factor: number
  ev_per_hand: number
  total_hands: number
  total_wagered: number
  total_wins: number
  total_losses: number

  // Risk
  max_drawdown: number
  max_drawdown_duration: number
  sharpe_ratio: number
  sortino_ratio: number
  var_95: number
  risk_of_ruin: number
  kelly_fraction: number

  // Distribution
  shoe_pnl_series: number[]
  bankroll_series: number[]
  bet_sizes: number[]
  winning_streak_max: number
  losing_streak_max: number

  // Side breakdown
  banker_bet_count: number
  player_bet_count: number
  tie_bet_count: number
  skipped_hands: number

  // Outcome distribution
  banker_win_count: number
  player_win_count: number
  tie_count: number
}

export interface BacktestResults {
  strategy_id: string
  strategy_name: string
  config: SimulationConfig
  shoes: ShoeResult[]
  metrics: PerformanceMetrics
  completed_at: string
  duration_ms: number
}

// ────────────────────────────────────────────────────────────
// AI Math Agent
// ────────────────────────────────────────────────────────────

export interface AgentRecommendation {
  id: string
  description: string
  rule_id?: string
  parameter: string
  current_value: unknown
  suggested_value: unknown
  expected_improvement: string
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  metadata?: {
    finding?: string
    math?: string
    impact?: string
    recommendation?: string
    confidence?: number
    honesty_score?: number
    recommendations?: AgentRecommendation[]
  }
}

export interface OptimizationConstraints {
  target_metric: 'net_pnl' | 'sharpe_ratio' | 'profit_factor' | 'ev_per_hand'
  max_drawdown?: number
  max_risk_of_ruin?: number
  min_win_rate?: number
  max_iterations: number
}

// ────────────────────────────────────────────────────────────
// App UI State
// ────────────────────────────────────────────────────────────

export type PanelTab = 'builder' | 'results' | 'agent'
export type Theme = 'dark' | 'light'
