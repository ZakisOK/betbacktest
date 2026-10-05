# Rule: runtime evidence for negative runtime claims

Kind: standing process rule (shipped by the kit; also carried by the
Layer 3 reviewer prompt)

## Rule

A claim that some behavior never happens at runtime (dead code, an
unused parameter, a header or event that is never sent) is never
settled by reading source alone. Platform layers (ambient context
propagation, interceptors, middleware instrumentation) can produce
runtime behavior that appears in no application source file. Before
acting on such a claim (deleting code, skipping a test, declaring a
path safe), obtain runtime evidence (a test, a trace, production
logs, metrics) or written confirmation from the owning team.
Re-reading the source with the same method is the same evidence,
not corroboration.

This rule is prose steering, not a machine check: negative runtime
claims are not mechanically detectable, so it binds through the
planning and review phases rather than CI (spec Layer 2 note).

## Remediation message

> violated: a change was justified by "never happens at runtime"
> from source reading alone. do instead: attach runtime evidence
> (test, trace, log, metric) or owner confirmation to the claim, or
> downgrade it to an open question in the plan.
