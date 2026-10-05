# Domain glossary

- **Shoe**: the stack of 6 or 8 shuffled decks hands are dealt from (`generateShoe`).
- **Hand**: one Banker-versus-Player deal, resolved with the standard third-card rules (`dealHand`, `playerDraws`, `bankerDraws`).
- **Natural**: a two-card total of 8 or 9; the hand ends immediately.
- **Outcome**: `Banker`, `Player` or `Tie`.
- **Rule**: one condition-plus-bet instruction in a strategy (for example, "after 3 Bankers, bet Player").
- **Strategy**: an ordered set of rules plus money management (progression, stop-loss, take-profit).
- **Progression**: how the stake changes after a win or loss (flat, Martingale and similar).
- **Backtest**: running a strategy over many simulated shoes and measuring the result.
- **EV (expected value)**: the long-run return per unit bet. These are fixed facts of the game and the app must never claim a strategy changes them:

| Bet | EV per unit |
|---|---|
| Banker | -1.06% |
| Player | -1.24% |
| Tie | -14.36% |

- **House edge**: the casino's advantage, the negative of EV. No sequence of bets removes it.
- **Pro**: the paid tier, granted by Lemon Squeezy webhooks through `profiles.subscription_tier` and `subscription_status`; it raises the daily AI query limit.
