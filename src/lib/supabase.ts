import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — auth will not work')
}

export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  key ?? 'placeholder'
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
