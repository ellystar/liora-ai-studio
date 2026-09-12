import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const KLING_BASE = Deno.env.get('KLING_API_BASE_URL') ?? 'https://api-singapore.klingai.com'
const KLING_KEY = Deno.env.get('KLING_API_KEY')!
const MODEL = Deno.env.get('KLING_MODEL_NAME') ?? 'kling-v2-5-turbo'
const SYSTEM = 'product_video'

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

    const body = await req.json()
    const firstFrame = body.firstFrame as { base64: string; mimeType: string } | undefined
    const lastFrame = body.lastFrame as { base64: string; mimeType: string } | undefined
    const prompt = (body.prompt as string | undefined) ?? ''
    const resolution = body.resolution as string | undefined
    const duration = Number(body.duration)

    if (!firstFrame?.base64 || (resolution !== '720p' && resolution !== '1080p') ||
        (duration !== 5 && duration !== 10)) {
      return json({ error: 'missing_input' }, 400)
    }
    // Fiyat veritabanindan. product_video 'job' birimli: kare sayisindan
    // bagimsiz tek sabit fiyat, cozunurluk/sure tablosu kaldirildi.
    const { data: sys, error: sysErr } = await admin
      .from('systems').select('unit, price, is_active').eq('id', SYSTEM).single()
    if (sysErr) {
      console.error('systems read failed', sysErr)
      return json({ error: 'server_error', detail: 'price_lookup_failed' }, 500)
    }
    if (!sys?.is_active) return json({ error: 'system_unavailable' }, 503)
    const cost = sys.price as number

    const { data: profile, error: profileErr } = await admin.from('profiles').select('credits').eq('id', user.id).single()
    if (profileErr) {
      console.error('profiles read failed', user.id, profileErr)
      return json({ error: 'server_error', detail: 'balance_lookup_failed' }, 500)
    }
    if (!profile || profile.credits < cost) return json({ error: 'insufficient_credits' }, 402)

    const mode = resolution === '1080p' ? 'pro' : 'std'
    // Kling 2.5 turbo: son kare (image_tail) yalniz pro/1080p'de desteklenir
    if (lastFrame?.base64 && mode === 'std') {
      return json({ error: 'last_frame_requires_1080p' }, 400)
    }
    const payload: Record<string, unknown> = {
      model_name: MODEL,
      image: firstFrame.base64,        // RAW base64, data: oneki YOK
      prompt,
      duration: String(duration),
      mode,
    }
    if (lastFrame?.base64) payload.image_tail = lastFrame.base64

    const kRes = await fetch(`${KLING_BASE}/v1/videos/image2video`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KLING_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const kData = await kRes.json().catch(() => ({}))
    if (!kRes.ok || kData?.code !== 0 || !kData?.data?.task_id) {
      return json({ error: 'provider_error', detail: kData?.message ?? `http_${kRes.status}` }, 502)
    }

    const { data: jobRow, error: insErr } = await admin.from('video_jobs').insert({
      user_id: user.id, status: 'processing', provider_task_id: kData.data.task_id,
      prompt, resolution, duration, credits_cost: cost, credits_charged: false,
    }).select('id').single()
    if (insErr || !jobRow) return json({ error: 'server_error' }, 500)

    return json({ jobId: jobRow.id })
  } catch (e) {
    console.error(e)
    return json({ error: 'server_error', detail: String(e) }, 500)
  }
})