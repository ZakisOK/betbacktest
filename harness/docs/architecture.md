# Architecture

## Three runtimes

| Runtime | Code | Holds secrets? |
|---|---|---|
| Browser | `src/` | No. Reads only `VITE_` values (Supabase URL and anon key, Sentry DSN, Lemon Squeezy variant IDs). |
| Cloudflare Pages Functions | `functions/api/` | Yes: `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LEMONSQUEEZY_*`, `INTERNAL_WEBHOOK_SECRET`, `FACEBOOK_APP_SECRET` |
| Local proxy (dev only) | `server.js` | `ANTHROPIC_API_KEY` from `.env`, port 3001 |

## How a backtest flows

1. The user defines rules in `src/components/StrategyBuilder/`. Plain-English
   rules go through `src/utils/nlRuleParser.ts`: a local regex parser first,
   then Claude for inputs it cannot parse.
2. `src/engine/simulator.ts` deals simulated shoes (`baccarat.ts`, seeded with
   `mulberry32` for reproducible runs) and applies the rules hand by hand.
3. `src/engine/metrics.ts` turns results into win rate, drawdown, P&L
   distribution and risk metrics, rendered by `src/components/Results/`.
4. `autoOptimizer.ts`, `discoveryEngine.ts` and `patternAnalyzer.ts` search
   and mutate strategies on top of the same simulator.

The engine has no React or DOM dependencies, so it runs fast (1,000+ shoes per
second) and can be tested in isolation. See `harness/rules/`.

## Server endpoints (`functions/api/`)

- `agent.ts`: the Claude math agent. Verifies the caller's Supabase token, then enforces a daily query limit per tier (`profiles.subscription_tier`) before calling Anthropic.
- `generate-report.ts`: builds an HTML report with Claude and stores it in the Supabase `reports` bucket and table.
- `webhooks/lemonsqueezy.ts`: subscription and purchase events. Verifies the HMAC `x-signature`, then updates `profiles` and `reports`.
- `delete-account.ts`, `meta-deletion.ts`: account deletion, including Meta's signed data-deletion callback.

## Data (Supabase)

- `profiles`: one row per user: `subscription_tier`, `subscription_status`, daily AI query counters.
- `reports`: generated reports, plus a storage bucket of the same name.
- Strategies stay client-side: Zustand `persist` in localStorage (key `baccarat-dashboard`), plus JSON export and import in the Strategy Builder.
- Schema: `supabase/schema.sql`; RLS fix: `supabase/migrations/fix_profiles_rls.sql`.
