# Invariant: webhook handlers verify the request signature before reading or writing any data

Kind: architectural invariant

## Rule

Every inbound webhook (`functions/api/webhooks/*`, `functions/api/meta-deletion.ts`)
verifies the provider's HMAC signature with `crypto.subtle` before
parsing the payload or touching Supabase. A missing or invalid signature
returns 403 (400 when the signed field is absent) and changes nothing.

Check (each file must report at least 1):

```
for f in functions/api/webhooks/*.ts functions/api/meta-deletion.ts; do echo "$f: $(grep -cE 'crypto\.subtle|verifySignature' "$f")"; done
```

Review also confirms the verification runs before the first Supabase call.

## Remediation message

> violated: a webhook handler reads or writes data before verifying the
> signature. do instead: verify the provider signature first (see
> verifySignature in webhooks/lemonsqueezy.ts) and return 403 on mismatch.
