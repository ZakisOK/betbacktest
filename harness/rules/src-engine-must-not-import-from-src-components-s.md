# Invariant: src/engine must not import from src/components, src/pages, src/hooks, src/store or react

Kind: forbidden dependency or call direction

## Rule

Dependencies point one way: UI and state import the engine, never the
reverse. `src/engine/` may import other engine files, `src/types` and
`src/utils`, nothing from the UI layers or from React or Zustand.

Check (must print nothing):

```
grep -rnE "from ['\"](react|react-dom|zustand)['\"]|from ['\"]\.\./(components|pages|hooks|store)" src/engine
```

## Remediation message

> violated: src/engine imports from the UI or state layer. do instead: move
> the shared type to src/types, or have the caller pass the data in; the
> engine must stay importable without React.
