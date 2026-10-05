# Backfill flow

For a team whose history cannot yet seed the bench. Layer 4 rests on tickets
that trace to a deployment, and the held-out split accepts no reconstructions.
A team with fewer than five traceable closures runs this flow first, then the
forward ticket rule, and arrives at Gate 2 once real history exists.

## The flow

1. Pick three to five recently shipped changes.

2. Reverse-engineer each into the ticket template, working from the merged
   review outward: the diff shows the change surface, and the review shows the
   acceptance criteria the humans actually applied.

3. Have the engineer who shipped it correct the draft. They know what the
   change was for; the reconstruction is a draft until they confirm it.

4. Mark every backfilled example as a reconstruction. A reconstruction seeds
   only the bench's tuning split, never the held-out split, because its
   acceptance criteria were written knowing the solution. The manifest's
   `tickets.backfilled_marked` records that this rule is honored.

## The forward rule

Once the harness is live, a ticket that enters a lane without machine-checkable
acceptance criteria is returned at the Plan phase (spec Section 4): a plan
cannot be ratified against criteria that cannot be checked. The backfill flow
is a one-time bootstrap; the forward rule keeps history honest from then on.

## Why the held-out split stays clean

The teams that most need a harness often have the thinnest history. The answer
is to say so, not to let a reconstructed bench pass for measurement: a
reconstruction in the held-out split would measure agreement with a known
solution, not the agent's ability to find one.
