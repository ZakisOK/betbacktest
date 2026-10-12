# Test topology

## What runs today

The Code Quality workflow (`.github/workflows/quality.yml`) runs on every pull
request into `main` and every push to `main`:

1. `npm ci --ignore-scripts`
2. `node_modules/.bin/tsc --noEmit`
3. `npm test` (Vitest, config in `vitest.config.mts`)
4. `npm run build`
5. TruffleHog, verified secrets only
6. CodeQL (JavaScript and TypeScript), in its own job

SonarCloud and CodeRabbit also review every pull request through their GitHub apps.

## Gaps

- Engine coverage is thin: `src/engine/baccarat.test.ts` covers shoe
  composition and seeded determinism only. Still missing: deal rules, metrics,
  and the EV figures in `glossary.md` as regression anchors.
- Biome, ESLint and Knip are configured but not enforced: the code does not pass them yet.

## Adding tests

Put engine tests beside the engine (`src/engine/*.test.ts`); Vitest picks up
any `src/**/*.test.ts` and runs it in Node, so CI covers new tests without
further wiring.

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
