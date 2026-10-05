# Invariant: the simulation engine in src/engine stays pure TypeScript with no React, DOM or browser APIs

Kind: architectural invariant

## Rule

No file under `src/engine/` touches `document`, `window`, `localStorage`,
`sessionStorage` or `navigator`. The engine takes plain data in and returns
plain data out, which keeps it fast (1,000+ shoes per second) and testable
outside a browser.

Check (must print nothing):

```
grep -rnE "\b(document|window|localStorage|sessionStorage|navigator)\." src/engine
```

## Remediation message

> violated: src/engine uses a browser API. do instead: pass the value in as a
> parameter from the component or store that calls the engine, and keep the
> browser call in src/components, src/hooks or src/store.
