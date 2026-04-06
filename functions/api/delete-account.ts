import { createClient } from '@supabase/supabase-js'

interface Env {
  VITE_SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  LEMONSQUEEZY_API_KEY: string
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return Response.json({ error: 'Invalid token' }, { status: 401 })

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('lemon_subscription_id')
      .eq('id', user.id)
      .single()

    if (profile?.lemon_subscription_id) {
      await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${profile.lemon_subscription_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
          Accept: 'application/vnd.api+json',
        },
      }).catch(console.error)
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError

    return Response.json({ ok: true })
  } catch (err) {
    console.error('Account deletion error:', err)
    return Response.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== 'POST') return new Response('Method not allowed', { status: 405 })
  return onRequestPost(context)
}
