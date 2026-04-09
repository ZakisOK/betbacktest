-- Migration: fix_profiles_rls.sql
-- Restricts profile UPDATE to safe user-editable fields only.
-- Subscription tier changes must go through the server-side function.
-- Reports must only be created server-side via webhook handler.

-- ── PROFILES UPDATE POLICY ────────────────────────────────────────────────────
-- Replace the broad UPDATE policy with column-level restrictions so clients
-- cannot write subscription_tier, lemon_customer_id, ai_queries_today, etc.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Revoke blanket UPDATE privilege from the authenticated role, then grant
-- only the three safe user-editable columns.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url, last_sign_in) ON public.profiles TO authenticated;

-- ── SUBSCRIPTION TIER UPDATE FUNCTION ────────────────────────────────────────
-- Server-side (service_role) function to update subscription fields.
-- Runs as SECURITY DEFINER with an explicit role check so only service_role
-- callers succeed even if the function is somehow exposed.

CREATE OR REPLACE FUNCTION public.update_subscription_tier(
  target_user_id      uuid,
  new_tier            text,
  new_status          text         DEFAULT NULL,
  new_lemon_customer  text         DEFAULT NULL,
  new_lemon_sub       text         DEFAULT NULL,
  new_ends_at         timestamptz  DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_role NOT IN ('service_role', 'supabase_admin') THEN
    RAISE EXCEPTION 'update_subscription_tier: caller role % is not authorized', current_role;
  END IF;

  UPDATE public.profiles
  SET
    subscription_tier     = new_tier,
    subscription_status   = COALESCE(new_status,          subscription_status),
    lemon_customer_id     = COALESCE(new_lemon_customer,  lemon_customer_id),
    lemon_subscription_id = COALESCE(new_lemon_sub,       lemon_subscription_id),
    subscription_ends_at  = new_ends_at
  WHERE id = target_user_id;
END;
$$;

-- Only service_role may execute this function; revoke from all other roles.
REVOKE EXECUTE ON FUNCTION public.update_subscription_tier FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.update_subscription_tier TO service_role;

-- ── REPORTS INSERT POLICY ─────────────────────────────────────────────────────
-- Drop the client-side INSERT policy. Reports are created exclusively by the
-- server-side webhook handler (generate-report edge function) which uses the
-- service_role key and therefore bypasses RLS entirely.

DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
