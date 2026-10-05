# Docs router

A catalog of what lives where in the docs tree. Read this first, then follow
one pointer. Keep it a catalog, not a content store.

## Topics

| Topic | Lives in | One-line summary |
|---|---|---|
| Architecture | `architecture.md` | browser engine, Pages Functions, Supabase, and how a backtest flows |
| Domain glossary | `glossary.md` | shoe, hand, rule, progression, EV and the other terms in the code |
| Test topology | `test-topology.md` | what CI checks today and where tests should go |
| Conventions | `conventions.md` | code style the reviewers enforce |
| Deployment | `deployment.md` | Cloudflare Pages, GitHub Pages, secrets and rollback |

## How to add a topic

- Create one file for the topic under this tree.
- Add one row here pointing at it.
- Do not restate a fact that already lives in a package map: route to it.
