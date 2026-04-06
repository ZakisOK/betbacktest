import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })

  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' })

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('lemon_subscription_id')
      .eq('id', user.id)
      .single()

    // Cancel Lemon Squeezy subscription if active
    if (profile?.lemon_subscription_id) {
      await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${profile.lemon_subscription_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
          Accept: 'application/vnd.api+json',
        },
      }).catch(console.error)
    }

    // Delete user data from all tables (cascades from profiles via FK)
    // Auth deletion will cascade to profiles via ON DELETE CASCADE
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Account deletion error:', err)
    return res.status(500).json({ error: 'Failed to delete account' })
  }
}
