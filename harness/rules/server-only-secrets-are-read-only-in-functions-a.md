# Invariant: server-only secrets are read only in functions/ and server.js; src/ reads only VITE_ public values

Kind: architectural invariant

## Rule

Browser code bundles everything it reads, so `src/` reads only
`import.meta.env.VITE_*` values (plus Vite built-ins like `MODE`). Keys such
as `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LEMONSQUEEZY_*`,
`INTERNAL_WEBHOOK_SECRET` and `FACEBOOK_APP_SECRET` are read only in
`functions/api/` (Cloudflare Pages Functions) or the local `server.js` proxy.

Check (must print nothing):

```
grep -rnoE "import\.meta\.env\.[A-Z_]+|process\.env" src | grep -vE "import\.meta\.env\.(VITE_[A-Z_]+|MODE|DEV|PROD|BASE_URL|SSR)$"
```

## Remediation message

> violated: browser code reads a server-only value. do instead: add or extend
> an endpoint in functions/api/ that uses the secret server-side, and call it
> from src/ with fetch('/api/...').
