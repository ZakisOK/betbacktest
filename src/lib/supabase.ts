import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)

export type SubscriptionTier = 'free' | 'pro' | 'lab'
export type SubscriptionStatus = 'none' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired'

export interface Profile {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  auth_provider: string | null
  subscription_tier: SubscriptionTier
  lemon_customer_id: string | null
  lemon_subscription_id: string | null
  subscription_status: SubscriptionStatus
  subscription_ends_at: string | null
  ai_queries_today: number
  ai_queries_reset_at: string
  created_at: string
  last_sign_in: string | null
}
