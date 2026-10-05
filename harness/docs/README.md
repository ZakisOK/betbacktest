# Docs tree

The system of record for cross-package knowledge: architecture, domain
glossaries, test topology (spec Layer 1). This tree is where a fact lives when
it spans packages. A package-root map (AGENTS.md) points here; it never copies
what lives here. No fact lives in both a map and this tree: the freshness CI
runs a near-duplicate check between them, and the monthly doc-gardening pass
catches semantic duplication a hash check cannot.

## Layout

- `ROUTER.md` at this root: the small, budget-capped catalog of what lives
  where. Read it first. It is the one file that must stay short so the tree
  cannot regrow into a single large hand-maintained context file.
- one file per cross-package topic below the root: architecture, glossary,
  test topology, and whatever else spans packages.

## Rules

- Router first: every reader starts at `ROUTER.md` and follows a pointer.
- Budget-capped router: the router is freshness-checked like a map. Keep it a
  catalog, not a content file.
- Route, do not replicate: a topic lives in exactly one file here, and the
  maps point at it.
