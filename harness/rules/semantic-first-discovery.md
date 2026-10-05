# Rule: semantic-first code discovery; never invent an API

Kind: standing process rule (shipped by the kit; also carried by the
Layer 3 reviewer prompt)

## Rule

When the needed behavior is known but its implementation name is
not, discovery goes through semantic (intent-based) code search
first; lexical search is for known identifiers, error strings, and
package names. A lexical miss is not evidence of absence, and it is
never license to invent: an internal API, class, or method that a
change references but does not define must be verified to exist
(open the source, or find it via code search) before the change
depends on it. When no implementation can be found either way, the
plan records an open question instead of a guessed interface.

Grounding for the failure mode: when retrieval misses, agents
retry query variations, then propose generic public patterns or
invent internal APIs.

This rule is prose steering, not a machine check: intent cannot be
mechanically detected, so it binds through the planning and review
phases rather than CI (spec Layer 2 note). The reviewer half is
checkable: an unverifiable reference in a diff is a finding.

## Remediation message

> violated: a change references an internal API that neither the
> diff nor the codebase defines, or discovery stopped at a lexical
> miss. do instead: search by intent (semantic code search), verify
> the reference resolves in the target tree, or record an open
> question in the plan instead of inventing the interface.
