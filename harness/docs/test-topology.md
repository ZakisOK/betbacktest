# Test topology

## What runs today

The Code Quality workflow (`.github/workflows/quality.yml`) runs on every pull
request into `main` and every push to `main`:

1. `npm ci --ignore-scripts`
2. `node_modules/.bin/tsc --noEmit`
3. `npm run build`
4. TruffleHog, verified secrets only
5. CodeQL (JavaScript and TypeScript), in its own job

SonarCloud and CodeRabbit also review every pull request through their GitHub apps.

## Gaps

- The Vitest suite (`npm test`) runs locally only. The workflow is a protected
  surface, so the owner adds a `npm test` step to the Code Quality workflow.
- Tests cover only `src/engine/engine.test.ts`: exact outcome probabilities,
  the EV figures in `glossary.md` for every table ruleset, and how the
  simulator settles Banker wins. Shoe composition, metrics, progressions and
  the optimizer have no tests yet.
- Biome, ESLint and Knip are configured but not enforced: the code does not pass them yet.

## Adding tests

Use Vitest, which fits the existing Vite setup. Put engine tests beside the
engine (`src/engine/*.test.ts`); `npm test` (or `node_modules/.bin/vitest run`)
runs them.

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
