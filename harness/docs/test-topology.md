# Test topology

## What runs today

The Code Quality workflow (`.github/workflows/quality.yml`) runs on every pull
request into `main` and every push to `main`:

1. `npm ci --ignore-scripts`
2. `node_modules/.bin/tsc --noEmit`
3. `node_modules/.bin/vitest run` (engine, parser and agent tests; config in `vitest.config.mts`)
4. `npm run build`
5. TruffleHog, verified secrets only
6. CodeQL (JavaScript and TypeScript), in its own job

SonarCloud and CodeRabbit also review every pull request through their GitHub apps.

## Tests today

Vitest characterization tests sit beside the code they pin:

- `src/engine/baccarat.test.ts`: shoe composition and seeded determinism.
- `src/engine/tableRules.test.ts`: exact 6- and 8-deck outcome probabilities, a
  negative EV for every bet under every table ruleset, deck count and tie
  handling, the EV figures in `glossary.md`, and how the simulator pays Banker
  wins under each ruleset.
- `src/engine/engine.test.ts`: the seeded PRNG, shoe and hand dealing,
  hands dealt per shoe up to the cut card, outcome probabilities against
  the glossary, `runSimulation` across every trigger, action and progression, metrics,
  pattern analysis, discovery and the auto optimizer (the agent is mocked).
- `src/utils/rules.test.ts`: `parseNLRule` over about 90 sentences (axios is
  mocked, so the AI fallback is offline) and `ruleToSentence`.
- `src/agent/mathAgent.test.ts`: the offline analysis, the API reply parsing and the token the client sends.
- `src/agent/agentProxy.test.ts`: the Claude proxy in `functions/api/agent.ts` (auth, validation, quota, token cap), with its reply read by the client parser so the two sides cannot drift apart. It sits in `src/` because Cloudflare Pages treats every file under `functions/` as a possible route.
- `src/lib/lemonsqueezy.test.ts`: the checkout message origin check.

`src/test/helpers.ts` fixes `Math.random` and fingerprints large results, so a
snapshot can pin thousands of hands. A snapshot change is a behavior change:
review the diff before running `vitest run -u`.

## Gaps

- No component tests; UI changes are checked in the browser.
- Biome, ESLint and Knip are configured but not enforced: the code does not pass them yet.

## Adding tests

Put tests beside the code they cover (`src/**/*.test.ts`); Vitest picks up
any of them and runs it in Node, so CI covers new tests without further
wiring.

## Harness checks (Z.Code)

`z-code.yaml` declares this repo's harness. With the Z.Code kit checked out
(the ZAK repo, `z-code/`), run from the repo root:

```
<kit>/bin/z-code doctor .
ZCODE_CHECKS=<kit>/checks ZCODE_PYTHON=<kit>/.venv/bin/python3 sh ci/z-code-freshness.sh
```

After editing `AGENTS.md`, re-seed its hash in the same pull request so drift
is measured from the new baseline:

```
<kit>/.venv/bin/python3 <kit>/checks/check_hash_drift.py z-code.yaml --seed
```

The freshness script is not in CI yet: the kit is not published, so CI cannot
fetch the checks. Wire it into the Code Quality workflow once ZAK is public.
