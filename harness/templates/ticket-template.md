# Ticket template

A well-formed ticket in this harness states a verifiable outcome, so the bench
(Layer 4) and the gate commands (Section 3) can both rest on it. Fill every
field. A ticket sized for one lane is completable end to end without a
mid-ticket decision about what is in bounds.

## Fields

**Title**

A verb plus an outcome ("Reject expired tokens at the session boundary"), not a
noun phrase.

**Problem**

Two to four sentences of domain language: what is wrong or missing and why it
matters. Not the implementation.

**Acceptance criteria**

Numbered. Each one independently checkable, each phrased so a gate command can
be derived from it: a check that fails before the change and passes after it.

1.
2.
3.

**Out of scope**

What this ticket deliberately does not touch.

**Expected change surface**

The packages or directories expected to change. This seeds the staging
manifest: the plan's file list is the only stageable set.

**Verification evidence** (filled at close)

Tests added or changed, filter-chain results.

**Deployment trace** (filled at close)

Merge and deployment references. A ticket that cannot be traced to a deployment
cannot become a bench scenario.

**Post-deploy check** (where applicable)

How the team confirmed the change behaves in production.
