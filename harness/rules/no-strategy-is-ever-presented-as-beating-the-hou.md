# Invariant: no strategy is ever presented as beating the house edge; the per-bet expected values are fixed facts

Kind: product truth (review-enforced)

## Rule

The app is a research tool. No UI copy, report, AI prompt or generated text
may claim that a strategy, progression or pattern removes or reverses the
house edge, or that results predict future shoes. The per-bet expected values
in `harness/docs/glossary.md` (Banker -1.06%, Player -1.24%, Tie -14.36%) are
fixed and appear unchanged wherever they are shown.

Not machine-checkable: disclaimers legitimately use the same words. Reviewers
check every change to UI copy, `src/agent/`, `functions/api/agent.ts` and
`functions/api/generate-report.ts` against it.

## Remediation message

> violated: copy or a prompt implies a strategy beats the house edge. do
> instead: describe results as historical simulation outcomes with variance,
> and state that the expected value of every bet stays negative.
