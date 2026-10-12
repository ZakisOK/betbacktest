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
| Banker | -1.06% (standard 5% commission) |
| Player | -1.24% |
| Tie | -14.36% |

- **Table rules**: how a winning Banker bet is paid (`table_rules`, `src/engine/tableRules.ts`). Only rulesets real tables deal are offered, because a bare commission below about 2.69% would give Banker a positive EV. Player and Tie are the same under every ruleset. `src/engine/engine.test.ts` pins each Banker EV below zero.

| Table rules | Banker rule | Banker EV (8 decks) |
|---|---|---|
| Standard | 5% commission on Banker wins | -1.06% |
| 4% commission | 4% commission on Banker wins | -0.60% |
| EZ Baccarat | no commission; a Banker win on a three-card 7 pushes | -1.02% |
| Super 6 | no commission; a Banker win on 6 pays 1:2 | -1.46% |

- **House edge**: the casino's advantage, the negative of EV. No sequence of bets removes it.
- **Pro**: the paid tier, granted by Lemon Squeezy webhooks through `profiles.subscription_tier` and `subscription_status`; it raises the daily AI query limit.
