import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const KLING_BASE = Deno.env.get('KLING_API_BASE_URL') ?? 'https://api-singapore.klingai.com'
const KLING_KEY = Deno.env.get('KLING_API_KEY')!

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'unauthorized' }, 401)
    const admin = createClient(supabaseUrl, serviceKey)

    const { jobId } = await req.json()
    if (!jobId) return json({ error: 'missing_input' }, 400)

    const { data: jobRow } = await admin
      .from('video_jobs').select('*').eq('id', jobId).eq('user_id', user.id).single()
    if (!jobRow) return json({ error: 'not_found' }, 404)
    if (jobRow.status === 'succeeded') return json({ status: 'succeeded' })
    if (jobRow.status === 'failed') return json({ status: 'failed' })

    const kRes = await fetch(`${KLING_BASE}/v1/videos/image2video/${jobRow.provider_task_id}`, {
      headers: { Authorization: `Bearer ${KLING_KEY}` },
    })
    const kData = await kRes.json().catch(() => ({}))
    const st = kData?.data?.task_status as string | undefined  // submitted|processing|succeed|failed

    if (st === 'succeed') {
      const url = kData?.data?.task_result?.videos?.[0]?.url as string | undefined
      if (!url) return json({ status: 'processing' })
      if (!jobRow.credits_charged) {
        await admin.rpc('deduct_credits', {
          p_user_id: user.id, p_amount: jobRow.credits_cost, p_tool: 'ai_video',
        })
        await admin.from('generations').insert({
          user_id: user.id, tool: 'ai_video', status: 'success',
          credits_charged: jobRow.credits_cost, image_count: 1,
          params: { resolution: jobRow.resolution, duration: jobRow.duration },
        })
        await admin.from('video_jobs').update({
          status: 'succeeded', credits_charged: true, updated_at: new Date().toISOString(),
        }).eq('id', jobRow.id)
      }
      return json({ status: 'succeeded', url })
    }

    if (st === 'failed') {
      await admin.from('generations').insert({
        user_id: user.id, tool: 'ai_video', status: 'failed',
        credits_charged: 0, image_count: 0,
        params: { resolution: jobRow.resolution, duration: jobRow.duration },
      })
      await admin.from('video_jobs').update({
        status: 'failed', error_code: kData?.data?.task_status_msg ?? 'failed',
        updated_at: new Date().toISOString(),
      }).eq('id', jobRow.id)
      return json({ status: 'failed' })
    }

    return json({ status: 'processing' })
  } catch (e) {
    console.error(e)
    return json({ error: 'server_error', detail: String(e) }, 500)
  }
})