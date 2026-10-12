# betbacktest map

Read by every coding agent (Claude Code, Codex, Kiro and any AGENTS.md reader). Pointers only: facts that span the codebase live in the docs tree, reached through `harness/docs/ROUTER.md`. Keep this file inside its token budget; the freshness checks fail when it drifts.

## What this package is

- A Baccarat strategy research tool: users build betting rules, backtest them over simulated shoes in the browser, and read risk metrics. Research only, never a gambling product.
- React 18 + TypeScript + Vite single-page app, with Cloudflare Pages Functions for the server side and Supabase for accounts and saved reports.

## Orient

- language: TypeScript (strict)
- build: npm; `npm run build` runs `tsc` then `vite build`
- tests: Vitest snapshot tests (`npm test`) pin the engine, rule parser and agent output; with `tsc --noEmit` and the build, they are the trusted checks
- entry points: `src/App.tsx` (routes), `src/engine/simulator.ts` (backtest core), `functions/api/agent.ts` (Claude proxy)

## Commands

- `npm ci` then `npm run dev`: app on http://localhost:5173
- `node server.js`: local Claude proxy on port 3001 (needs `ANTHROPIC_API_KEY` in `.env`)
- `node_modules/.bin/tsc --noEmit`, `npm test` and `npm run build`: what CI runs

## Where things live

- `src/engine/`: pure simulation, metrics, optimizer, discovery, pattern analysis
- `src/components/`, `src/pages/`: UI and legal pages; `src/store/useStore.ts`: Zustand state
- `src/agent/`, `src/utils/nlRuleParser.ts`: Claude-assisted analysis and rule parsing
- `functions/api/`: server endpoints and webhooks; `supabase/`: schema and RLS fixes

## Pointers

- architecture, glossary, tests, conventions, deployment: `harness/docs/ROUTER.md`
- invariants an agent must not break: `harness/rules/`
- harness manifest: `z-code.yaml`

## Cold start

- read this map, then the router, then at most one topic file
- before touching `src/engine/` or `functions/`, read the matching rule in `harness/rules/`
