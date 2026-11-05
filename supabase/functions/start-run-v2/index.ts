// v2 · start-run-v2: bir üretim işini açar ve karelerini tetikler.
// Sözleşme: "start-run-v2 adım adım", K15, K16. İlk sürüm: Ghost'tan Kampanyaya, tek kare.
//
// Bu fonksiyon kredi düşmez. Kare run-frame-v2'de kullanıcının kendi oturumuyla
// generate-ecom'a gider; kredi orada, mevcut yoldan, yalnızca gelen kare için düşer.
// Paket kilidi (min_plan) katalog bağlanınca eklenecek; v2 kartları bugün prototipin görselleri.
//
// Dağıtım yalnızca adıyla ve JWT kapalıyla (oturumu fonksiyon kendisi denetler):
//   npx supabase functions deploy start-run-v2 --project-ref teemolajohctzejbwbrj --no-verify-jwt --use-api

import { createClient } from 'npm:@supabase/supabase-js@2'
import { type CampaignParams, parseCampaignInput, SYSTEM_ID } from '../_v2/campaign.ts'

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

type OpenedJob = { job_id: string; frames: { id: string; idx: number; pose_key: string }[] }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'unauthorized' }, 401)

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return json({ error: 'invalid_input', field: 'body' }, 400)
    }
    const parsed = parseCampaignInput(body, user.id)
    if (!parsed.ok) return json({ error: 'invalid_input', field: parsed.field }, 400)

    const admin = createClient(supabaseUrl, serviceKey)

    // Fiyat her zaman veritabanından; arayüzden gelmez (Kural 6).
    const { data: sys, error: sysErr } = await admin
      .from('systems').select('price, is_active').eq('id', SYSTEM_ID).single()
    if (sysErr || !sys) {
      console.error('systems read failed', sysErr)
      return json({ error: 'server_error', detail: 'price_lookup_failed' }, 500)
    }
    if (!sys.is_active) return json({ error: 'system_unavailable' }, 503)
    const price = sys.price as number

    // Aynı kullanıcı aynı anda birden çok iş çalıştırabilir. Bakiye ayrılmaz, ama açık
    // işlerdeki bitmemiş kareler de hesaba katılır (sözleşme: Bilinen boşluklar, "Rezervasyon
    // yok"). Bu yumuşak bir kontrol: aynı anda başlatılan iki iş yine aşabilir; o zaman kare
    // generate-ecom'da düşer, ücret alınmaz. Kesin kontrol generate-ecom'da, kare başına.
    const { count: openFrames, error: openFramesErr } = await admin
      .from('job_frames').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).in('status', ['queued', 'running'])
    const { data: profile, error: profileErr } = await admin
      .from('profiles').select('credits').eq('id', user.id).single()
    if (openFramesErr || profileErr || !profile) {
      console.error('balance read failed', user.id, openFramesErr ?? profileErr)
      return json({ error: 'server_error', detail: 'balance_lookup_failed' }, 500)
    }
    const pending = openFrames ?? 0
    const required = price * (parsed.input.frames.length + pending)
    const balance = (profile.credits as number) ?? 0
    if (balance < required) return json({ error: 'insufficient_credits', balance, required, pending }, 402)

    const params: CampaignParams = { ...parsed.input, price }
    const { data: opened, error: openErr } = await admin.rpc('v2_open_job', {
      p_user_id: user.id,
      p_flow: 'campaign',
      p_title: parsed.title,
      p_params: params,
      p_pose_keys: params.frames.map((f) => f.key),
      p_setup_id: parsed.setupId,
    })
    if (openErr) {
      const msg = openErr.message ?? ''
      if (msg.includes('setup_not_found')) return json({ error: 'setup_not_found' }, 404)
      console.error('v2_open_job failed', user.id, openErr)
      return json({ error: 'server_error', detail: 'open_job_failed' }, 500)
    }
    const job = opened as OpenedJob

    // Her kare kendi çağrısında üretilir (T2). Yanıt beklenmez; tetikleme düşerse kare
    // queued kalır ve 10 dakika sonra kurtarma kaydına göre kapatır (K16).
    for (const f of job.frames) {
      EdgeRuntime.waitUntil(triggerFrame(supabaseUrl, anonKey, authHeader, f.id))
    }

    return json({ jobId: job.job_id, frames: job.frames.map((f) => ({ id: f.id, idx: f.idx })) }, 202)
  } catch (e) {
    console.error(e)
    return json({ error: 'server_error' }, 500)
  }
})

async function triggerFrame(supabaseUrl: string, anonKey: string, authHeader: string, frameId: string) {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/run-frame-v2`, {
      method: 'POST',
      headers: { Authorization: authHeader, apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ frameId }),
    })
    const text = await res.text()
    if (!res.ok) console.error('run-frame-v2 trigger failed', frameId, res.status, text)
  } catch (e) {
    console.error('run-frame-v2 trigger failed', frameId, e)
  }
}
