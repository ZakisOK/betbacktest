# Conventions

## Stack choices

- TypeScript strict mode. No `any`; every exported function has explicit types.
- Tailwind for all styling, no inline styles.
- Zustand for global state (`src/store/useStore.ts`); local state for component-only concerns.
- Recharts for all charts.

## Code style

- Comments explain why, never what. Do not restate the next line.
- Concise, domain-specific names (`shoe`, `progression`, `drawdown`), never `handleButtonClickEvent` or `dataResponseObject`.
- Error messages carry business context: "Failed to generate report: Anthropic returned 529", never "An error occurred".
- Delete dead code; never comment it out.

## Commits

Conventional Commits (`feat:`, `fix:`, `ci:`, `chore:` and so on), enforced by
commitlint in the lefthook `commit-msg` hook. The pre-commit hook runs Biome on
staged files and gitleaks.
