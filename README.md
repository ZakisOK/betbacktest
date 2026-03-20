# 🎴 Baccarat Strategy Dashboard

A web-based Baccarat betting strategy dashboard with a backtesting engine and AI-powered math agent for strategy optimization.

> **Mathematical research tool only.** No betting system eliminates the house edge. Banker EV = −1.06% · Player EV = −1.24% · Tie EV = −14.36%.

## Features

### Strategy Builder
- Visual rule builder using **Trigger → Action → Modifier** pattern
- Full trigger library: streak detection, pattern matching, financial state, hand count, composite (AND/OR)
- All action types: place bet, adjust unit, skip hand, reset progression, lock side, stop loss, take profit
- Progression systems: Flat, Martingale, Fibonacci, D'Alembert, Labouchere, Oscar's Grind, 1-3-2-6
- Import/export strategy JSON · Save to library · Version tracking

### Backtesting Engine
- Statistically correct 8/6-deck Baccarat simulation (verified Banker: 45.86%, Player: 44.62%, Tie: 9.52%)
- Full third-card rule implementation (official Baccarat rules)
- Configurable: shoe count, commission rate, cut card position, tie handling, starting bankroll
- 1,000+ shoes/second in browser (TypeScript engine)
- Reproducible results with random seed

### Performance Analytics
- **Equity Curve** with confidence bands
- **P&L Distribution** histogram with VaR overlay
- **Risk Radar** multi-dimensional profile
- Core financial metrics: Net P&L, ROI, Win Rate, Profit Factor, EV/hand
- Risk metrics: Max Drawdown, Sharpe, Sortino, VaR 95%, Risk of Ruin, Kelly Criterion
- Strategy comparison (current vs previous)
- Shoe-level heatmap

### AI Math Agent
- Built-in mathematical analysis engine (works offline)
- Claude API integration for conversational AI analysis
- Structured output: Finding → Math → Impact → Recommendation → Confidence → Honesty Score
- Honesty Score: probability results reflect variance vs genuine edge
- Quick prompts for common analyses

## Quick Start

```bash
# Install dependencies
npm install

# Start the frontend
npm run dev

# (Optional) Start the Claude API proxy for AI features
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
node server.js
```

Open [http://localhost:5173](http://localhost:5173)

## Configuration

### Basic Usage (No API Key)
The dashboard works fully without any API key. The built-in math engine provides:
- Expected value calculations
- Progression sustainability analysis
- Risk of ruin estimates
- Honesty score via permutation test approximation

### AI-Enhanced Mode
Set `ANTHROPIC_API_KEY` in `.env` and run `node server.js` alongside the dev server for full Claude API integration.

```env
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
```

## Architecture

```
src/
├── engine/
│   ├── baccarat.ts      # Game rules, shoe generation, hand dealing
│   ├── simulator.ts     # Strategy evaluation engine
│   └── metrics.ts       # Performance metrics calculation
├── agent/
│   └── mathAgent.ts     # Claude API + built-in math analysis
├── store/
│   └── useStore.ts      # Zustand state management
├── components/
│   ├── StrategyBuilder/ # Left panel: rule builder, sim config
│   ├── Results/         # Center panel: charts, metrics, risk
│   └── MathAgent/       # Right panel: conversational AI
└── types/
    └── index.ts         # TypeScript interfaces
```

## Baccarat Probability Reference

| Outcome | Probability | EV (8-deck, 5% commission) |
|---------|-------------|---------------------------|
| Banker  | 45.86%      | −1.06% per unit           |
| Player  | 44.62%      | −1.24% per unit           |
| Tie     | 9.52%       | −14.36% per unit          |

## Strategy Schema

```json
{
  "name": "Banker Follow Progressive",
  "version": "1.0",
  "base_unit": 25,
  "bankroll": 5000,
  "rules": [
    {
      "priority": 1,
      "trigger": { "type": "hand_count", "hand_min": 1 },
      "action": { "type": "place_bet", "side": "Banker", "unit_size": 1 },
      "modifiers": { "max_bet": 500, "shoe_reset": "reset" }
    },
    {
      "priority": 2,
      "trigger": { "type": "streak", "side": "Banker", "min_length": 2, "direction": "consecutive_losses" },
      "action": { "type": "adjust_unit", "method": "martingale", "value": 2 },
      "modifiers": { "max_bet": 400, "bankroll_guard": 0.1 }
    }
  ]
}
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| State | Zustand |
| Charts | Recharts |
| Styling | TailwindCSS |
| AI | Claude claude-sonnet-4-5 via Anthropic API |
| Build | Vite |

---

*BRD v1.0 — Prepared March 2, 2026*
