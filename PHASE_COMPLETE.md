# BetBacktest — Phase 1, 2, 3 Complete

Build completed. Zero TypeScript errors. `npm run build` passes.

---

## What Was Built

### Phase 1 — Auth + Database

- `supabase/schema.sql` — Full schema: profiles, strategies, strategy_versions, backtests, agent_conversations, shoe_data, reports. RLS policies on all tables. Auto-create profile trigger on sign-up. Daily AI query reset cron instructions.
- `src/lib/supabase.ts` — Supabase client with Profile type
- `src/hooks/useAuth.ts` — Session management, profile loading, Apple name capture, localStorage migration detection
- `src/store/useStore.ts` — Added: user, session, authLoading, showUpgradeModal, pendingMigration, all auth actions, refetchProfile
- `src/components/LandingPage.tsx` — Hero, pricing cards (Free/Pro/Lab), feature comparison table, footer with legal links
- `src/components/AuthModal.tsx` — Apple, Google, Facebook OAuth + email/password, sign-up/sign-in toggle
- `src/pages/AuthCallback.tsx` — OAuth redirect handler at /auth/callback
- `src/components/DeleteAccount.tsx` — Confirmation modal with "DELETE" text input, calls /api/delete-account
- `src/App.tsx` — Full rewrite: React Router, auth gate, migration modal, Lemon Squeezy Checkout.Success listener, sign-out button, tier badge in header
- `src/main.tsx` — Added BrowserRouter, Sentry init
- `index.html` — Updated title, lemon.js, Plausible Analytics
- `vite.config.ts` — base: '/', removed proxy (API → Vercel serverless)
- `vercel.json` — SPA rewrite rules, security headers

### Phase 2 — Payments

- `src/lib/lemonsqueezy.ts` — openCheckout() helper, VARIANT_IDS constants
- `src/components/UpgradeModal.tsx` — Monthly/annual toggle, Pro/Lab cards, feature comparison, openCheckout() calls
- `api/webhooks/lemonsqueezy.ts` — HMAC-SHA256 signature verification, handles: order_created, subscription_created, subscription_updated, subscription_payment_success, subscription_payment_failed
- `api/agent.ts` — Claude proxy with JWT auth, tier-based query limits (5/50/unlimited), query counter increment
- `api/generate-report.ts` — Claude deep analysis → HTML → Supabase Storage upload
- `api/delete-account.ts` — Cancel LS subscription + delete all user data via service_role
- `api/meta-deletion.ts` — Facebook signed_request handler
- Tier enforcement in ResultsPanel: risk metrics blurred behind Pro gate, upgrade banner for free tier

### Phase 3 — Monetization

- `src/components/AdSlot.tsx` — Renders placeholder ad divs for free tier only
- AdSlot placed in ResultsPanel footer
- Upgrade house banner at top of ResultsPanel (free tier)
- Affiliate CTA after backtest results with geo-filter (language-based) and disclosure
- Deep Analysis Report purchase button ($4.99) in ResultsPanel, calls openCheckout()
- Legal pages: /terms, /privacy, /disclaimer, /cookies, /responsible-gambling
- Footer links to all legal pages
- Gambling disclaimer always visible in footer

---

## Manual Steps Required Before Launch

### 1. Supabase (supabase.com)

1. Create a new project
2. Go to SQL Editor → paste and run `supabase/schema.sql`
3. Go to Database → Extensions → enable `pg_cron`, then run the cron schedule SQL from the comment at bottom of schema.sql
4. Go to Authentication → Providers → enable Apple, Google, Facebook
   - **Apple**: Requires Apple Developer account, create a Service ID, configure redirect URL as `https://your-project-id.supabase.co/auth/v1/callback`
   - **Google**: Create OAuth credentials in Google Cloud Console
   - **Facebook**: Create Facebook App, configure Valid OAuth Redirect URIs
5. Go to Storage → create bucket named `reports` (private)
6. Copy your project URL and anon key

### 2. Lemon Squeezy (lemonsqueezy.com)

1. Create a store
2. Create products:
   - Pro Monthly ($19/mo, with 7-day trial)
   - Pro Annual ($190/yr, with 7-day trial)
   - Lab Monthly ($49/mo, with 7-day trial)
   - Lab Annual ($490/yr, with 7-day trial)
   - Deep Analysis Report ($4.99, one-time)
3. Get all variant IDs from product pages
4. Set up webhook pointing to `https://betbacktest.com/api/webhooks/lemonsqueezy`
   - Events: order_created, subscription_created, subscription_updated, subscription_payment_success, subscription_payment_failed
5. Copy API key, webhook secret, store ID

### 3. Anthropic (anthropic.com)

1. Create API key at console.anthropic.com

### 4. Vercel (vercel.com)

1. Import the GitHub repo (Betsimulator-)
2. Set framework to Vite
3. Add all environment variables from `.env.example` with real values:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
VITE_LS_STORE_URL=
VITE_LS_PRO_MONTHLY_VARIANT_ID=
VITE_LS_PRO_ANNUAL_VARIANT_ID=
VITE_LS_LAB_MONTHLY_VARIANT_ID=
VITE_LS_LAB_ANNUAL_VARIANT_ID=
VITE_LS_REPORT_VARIANT_ID=
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_STORE_ID=
ANTHROPIC_API_KEY=
VITE_AFFILIATE_URL=
VITE_SENTRY_DSN=
VITE_PLAUSIBLE_DOMAIN=betbacktest.com
```

4. Deploy. Note the Vercel URL.
5. Set Supabase Auth redirect URLs to include `https://betbacktest.com/auth/callback` and your Vercel preview URL.

### 5. Sentry (optional but recommended)

1. Create a project at sentry.io
2. Copy the DSN and add as `VITE_SENTRY_DSN`

### 6. Plausible (optional)

1. Sign up at plausible.io
2. Add domain `betbacktest.com`
3. The script tag is already in index.html

### 7. AdSense (Phase 3, after launch)

1. Apply for Google AdSense
2. Add AdSense script to index.html
3. Wire up the ad unit IDs in AdSlot: `ad-results-footer`, `ad-strategy-inline`

### 8. After deployment

1. Test sign-up with each OAuth provider
2. Test Lemon Squeezy checkout (use test mode)
3. Set Lemon Squeezy webhook to your live URL
4. Run a backtest, verify results appear
5. Test AI agent (verify query counter increments)
6. Test account deletion end-to-end

---

## What to Test First

1. Sign up with Google → lands on dashboard → run a backtest
2. Free tier: confirm risk metrics are blurred, AI limit shows after 5 queries
3. Upgrade flow: click Upgrade, complete Lemon Squeezy checkout (test mode), verify tier updates
4. Sign out → lands on landing page

---

## Live URL

Set by Vercel after first deploy. Will be `https://betbacktest.com` once you connect the domain.

---

## Remaining TODOs (post-launch)

- Wire up real AdSense ad unit IDs
- Add Facebook App Secret as `FACEBOOK_APP_SECRET` env var for meta-deletion verification
- Add Sentry error alerts for webhook failures
- Consider code-splitting to reduce the 1.1MB bundle (recharts + supabase are large)
- Add email notifications for report generation completion
