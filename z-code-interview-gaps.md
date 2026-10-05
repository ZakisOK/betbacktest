# z-code interview gap report

Fields the interview could not resolve from your answers or the discovery scan. Each is reported as unknown, tell us; none is filled with a guessed default. A field written as a placeholder fails z-code doctor until you answer it. This report reads local files only; nothing is transmitted.

- [unknown, tell us] harness.secondary
  - named secondary not given (spec Section 9); optional but recommended
- [unknown, tell us] review.decorrelation.last_passed
  - reviewer seeded-defect check has not run; placeholder date fails doctor until Layer 3 ships
- [unknown, tell us] evaluation.scenarios
  - only 0 bench tickets named; the held-out minimum is 5 (spec Section 6). Run the Section 13.3 backfill flow first.
- [unknown, tell us] evaluation.last_verified
  - bench not yet built and verified; placeholder date reports UNVERIFIED until it is (spec Section 9)

## Resolved after the interview

- context.reference_tokenizer: set to `z_code.tokens.whitespace-v1`, the kit's documented proxy tokenizer (2026-10-05).

## Summary

- unknowns to resolve: 4
