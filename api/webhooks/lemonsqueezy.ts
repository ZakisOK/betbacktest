import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!
  const hmac = createHmac('sha256', secret).update(body).digest('hex')
  return hmac === signature
}

const PRO_VARIANTS = new Set([
  process.env.VITE_LS_PRO_MONTHLY_VARIANT_ID,
  process.env.VITE_LS_PRO_ANNUAL_VARIANT_ID,
])

function getTierFromVariant(variantId: string): 'pro' | 'lab' {
  return PRO_VARIANTS.has(variantId) ? 'pro' : 'lab'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const signature = req.headers['x-signature'] as string
  if (!signature) return res.status(403).json({ error: 'Missing signature' })

  const rawBody = JSON.stringify(req.body)
  if (!verifySignature(rawBody, signature)) {
    return res.status(403).json({ error: 'Invalid signature' })
  }

  const event = req.headers['x-event-name'] as string
  const payload = req.body as {
    meta?: { custom_data?: { user_id?: string }; event_name?: string }
    data?: {
      attributes?: {
        status?: string
        variant_id?: string
        customer_id?: string
        ends_at?: string | null
        first_subscription_item?: { variant_id?: string }
        order_item_id?: string
      }
      id?: string
    }
  }

  const userId = payload.meta?.custom_data?.user_id
  const attributes = payload.data?.attributes

  try {
    switch (event) {
      case 'order_created': {
        if (!userId) break
        // Store report order
        await supabase.from('reports').insert({
          user_id: userId,
          order_id: payload.data?.id ?? '',
          status: 'pending',
        })
        // Trigger report generation (fire and forget)
        fetch(`${process.env.VERCEL_URL}/api/generate-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, orderId: payload.data?.id }),
        }).catch(console.error)
        break
      }

      case 'subscription_created': {
        if (!userId || !attributes) break
        const variantId = String(attributes.variant_id ?? attributes.first_subscription_item?.variant_id ?? '')
        await supabase.from('profiles').update({
          subscription_tier: getTierFromVariant(variantId),
          lemon_customer_id: String(attributes.customer_id ?? ''),
          lemon_subscription_id: payload.data?.id ?? '',
          subscription_status: 'active',
          subscription_ends_at: null,
        }).eq('id', userId)
        break
      }

      case 'subscription_updated': {
        if (!userId || !attributes) break
        const status = attributes.status
        const variantId = String(attributes.variant_id ?? attributes.first_subscription_item?.variant_id ?? '')
        const updates: Record<string, unknown> = {
          subscription_status: status,
          subscription_tier: getTierFromVariant(variantId),
        }
        if (status === 'cancelled') {
          updates.subscription_ends_at = attributes.ends_at
        }
        if (status === 'expired' || status === 'paused') {
          updates.subscription_tier = 'free'
          updates.subscription_status = status
        }
        await supabase.from('profiles').update(updates).eq('id', userId)
        break
      }

      case 'subscription_payment_success': {
        if (!userId) break
        await supabase.from('profiles').update({ subscription_status: 'active' }).eq('id', userId)
        break
      }

      case 'subscription_payment_failed': {
        if (!userId) break
        await supabase.from('profiles').update({ subscription_status: 'past_due' }).eq('id', userId)
        break
      }
    }

    return res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
