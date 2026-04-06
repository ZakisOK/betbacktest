-- BetBacktest Database Schema
-- Run this in your Supabase SQL editor after creating a new project.

-- ── PROFILES ──────────────────────────────────────────────────────────────────
-- Auto-created via trigger when a user signs up through Supabase Auth.

CREATE TABLE IF NOT EXISTS public.profiles (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 text NOT NULL,
  display_name          text,
  avatar_url            text,
  auth_provider         text CHECK (auth_provider IN ('apple', 'google', 'facebook', 'email')),
  subscription_tier     text NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'lab')),
  lemon_customer_id     text,
  lemon_subscription_id text,
  subscription_status   text NOT NULL DEFAULT 'none' CHECK (subscription_status IN ('none', 'active', 'past_due', 'paused', 'cancelled', 'expired')),
  subscription_ends_at  timestamptz,
  ai_queries_today      integer NOT NULL DEFAULT 0,
  ai_queries_reset_at   date NOT NULL DEFAULT CURRENT_DATE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  last_sign_in          timestamptz DEFAULT now()
);

-- ── STRATEGIES ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.strategies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        text NOT NULL,
  version     text DEFAULT '1.0',
  config_json jsonb NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── STRATEGY VERSIONS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.strategy_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id     uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  version_number  integer NOT NULL,
  config_json     jsonb NOT NULL,
  change_notes    text,
  created_at      timestamptz DEFAULT now()
);

-- ── BACKTESTS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.backtests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id  uuid NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sim_config   jsonb NOT NULL,
  metrics      jsonb NOT NULL,
  shoe_count   integer,
  duration_ms  integer,
  created_at   timestamptz DEFAULT now()
);

-- ── AGENT CONVERSATIONS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  strategy_id  uuid REFERENCES public.strategies(id) ON DELETE SET NULL,
  messages     jsonb NOT NULL DEFAULT '[]',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- ── SHOE DATA ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.shoe_data (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  source_name  text NOT NULL,
  sequences    jsonb NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- ── REPORTS ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  strategy_id  uuid REFERENCES public.strategies(id) ON DELETE SET NULL,
  order_id     text NOT NULL,
  pdf_path     text,
  status       text DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'ready', 'failed')),
  created_at   timestamptz DEFAULT now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoe_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Strategies
CREATE POLICY "Users can view own strategies"
  ON public.strategies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own strategies"
  ON public.strategies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own strategies"
  ON public.strategies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own strategies"
  ON public.strategies FOR DELETE USING (auth.uid() = user_id);

-- Strategy Versions
CREATE POLICY "Users can view own strategy versions"
  ON public.strategy_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.strategies s WHERE s.id = strategy_id AND s.user_id = auth.uid()));
CREATE POLICY "Users can insert own strategy versions"
  ON public.strategy_versions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.strategies s WHERE s.id = strategy_id AND s.user_id = auth.uid()));

-- Backtests
CREATE POLICY "Users can view own backtests"
  ON public.backtests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own backtests"
  ON public.backtests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Agent Conversations
CREATE POLICY "Users can view own conversations"
  ON public.agent_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own conversations"
  ON public.agent_conversations FOR ALL USING (auth.uid() = user_id);

-- Shoe Data
CREATE POLICY "Users can manage own shoe data"
  ON public.shoe_data FOR ALL USING (auth.uid() = user_id);

-- Reports
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports"
  ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── TRIGGER: Auto-create profile on sign-up ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url, auth_provider)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_app_meta_data->>'provider'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ── STORAGE: Reports bucket ────────────────────────────────────────────────────
-- Run in Supabase dashboard: Storage > New Bucket > "reports" (private)

-- ── CRON: Daily AI query reset ────────────────────────────────────────────────
-- Enable pg_cron extension in Supabase dashboard first (Database > Extensions > pg_cron),
-- then run this in the SQL editor:
--
-- SELECT cron.schedule(
--   'reset-ai-queries',
--   '0 0 * * *',
--   $$UPDATE public.profiles SET ai_queries_today = 0, ai_queries_reset_at = CURRENT_DATE$$
-- );
