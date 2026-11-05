// v2 · run-frame-v2: tek bir kareyi üretir. Sözleşme: "start-run-v2 adım adım", K15, K16.
// İlk sürüm: Ghost'tan Kampanyaya (generate-ecom), tek kare.
//
// Kareyi sahiplenir (queued -> running; aynı kare iki kez çalışmaz), hemen 202 döner,
// üretimi arka planda yürütür. generate-ecom kullanıcının kendi oturumuyla çağrılır;
// kredi orada, mevcut yoldan düşer. Kare her zaman kendi kaydına göre kapanır
// (v2_reconcile_frame); yanıttaki creditsCharged'a güvenilmez. Görsel yanıtta olup
// kaydedilmediyse önce kendi kopyası yazılır; iade yalnızca görsel gerçekten elde yoksa.
// Motordan kesin bir yanıt alınamazsa kare kapatılmaz: running kalır, 10 dakika sonra
// kurtarma (v2_recover_frames) kaydına göre kapatır.
//
// Dağıtım yalnızca adıyla ve JWT kapalıyla (oturumu fonksiyon kendisi denetler):
//   npx supabase functions deploy run-frame-v2 --project-ref teemolajohctzejbwbrj --no-verify-jwt --use-api

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  buildEcomBody,
  type CampaignParams,
  errorCodeFrom,
  type Img,
  isOwnUpload,
  isUuid,
  type LoadedInputs,
  mimeFromPath,
  parseDataUrl,
  toBase64,
} from '../_v2/campaign.ts'

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void }

const MAX_INPUT_BYTES = 10 * 1024 * 1024

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

type Frame = { id: string; job_id: string; idx: number }
type Ctx = {
  admin: SupabaseClient
  supabaseUrl: string
  anonKey: string
  authHeader: string
  userId: string
  frame: Frame
}

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

    let frameId: unknown
    try {
      frameId = (await req.json())?.frameId
    } catch {
      frameId = undefined
    }
    if (!isUuid(frameId)) return json({ error: 'invalid_input', field: 'frameId' }, 400)

    const admin = createClient(supabaseUrl, serviceKey)

    // Sahiplenme: yalnızca kendi karesi ve yalnızca queued ise. İkinci tetikleme burada durur.
    const { data: frame, error: claimErr } = await admin
      .from('job_frames')
      .update({ status: 'running' })
      .eq('id', frameId)
      .eq('user_id', user.id)
      .eq('status', 'queued')
      .select('id, job_id, idx')
      .maybeSingle()
    if (claimErr) {
      console.error('frame claim failed', frameId, claimErr)
      return json({ error: 'server_error' }, 500)
    }
    if (!frame) return json({ error: 'frame_not_queued' }, 409)

    EdgeRuntime.waitUntil(processFrame({ admin, supabaseUrl, anonKey, authHeader, userId: user.id, frame: frame as Frame }))
    return json({ frameId, status: 'running' }, 202)
  } catch (e) {
    console.error(e)
    return json({ error: 'server_error' }, 500)
  }
})

async function processFrame(ctx: Ctx) {
  const { admin, userId, frame } = ctx
  const finishFailed = async (code: string) => {
    const { error } = await admin.rpc('v2_finish_frame', {
      p_frame_id: frame.id, p_status: 'failed', p_credits: 0,
      p_generation_image_id: null, p_storage_path: null, p_error_code: code,
    })
    if (error) console.error('v2_finish_frame failed', frame.id, error)
  }

  try {
    const { data: job, error: jobErr } = await admin
      .from('jobs').select('flow, params').eq('id', frame.job_id).single()
    if (jobErr || !job || job.flow !== 'campaign') {
      console.error('job read failed', frame.id, jobErr)
      return await finishFailed('invalid_job')
    }
    const params = job.params as CampaignParams
    const spec = params.frames?.[frame.idx]
    if (!spec) return await finishFailed('invalid_job')

    let inputs: LoadedInputs
    try {
      inputs = await loadInputs(admin, params, userId)
    } catch (e) {
      // Motor henüz çağrılmadı: kredi düşmüş olamaz.
      console.error('input load failed', frame.id, e)
      return await finishFailed('input_missing')
    }

    let res: Response
    try {
      res = await fetch(`${ctx.supabaseUrl}/functions/v1/generate-ecom`, {
        method: 'POST',
        headers: { Authorization: ctx.authHeader, apikey: ctx.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildEcomBody(params, spec, frame.id, inputs)),
      })
    } catch (e) {
      // Motorun ne yaptığını bilmiyoruz (kredi düşmüş olabilir): kare running kalır,
      // kurtarma 10 dakika sonra kaydına göre kapatır (K16).
      console.error('generate-ecom call failed', frame.id, e)
      return
    }

    let out: unknown = null
    try {
      out = await res.json()
    } catch {
      out = null
    }
    const o = (out && typeof out === 'object' ? out : {}) as { images?: unknown; savedImages?: unknown }
    const images = Array.isArray(o.images) ? o.images : []
    const saved = Array.isArray(o.savedImages) ? o.savedImages : []

    if (res.ok && images.length > 0 && saved.length === 0) {
      // Kredi düştü, görsel yanıtta ama kaydı düşmüş: görseli kendimiz saklarız
      // (sözleşme: Bilinen boşluklar, "kullanıcı karesini kaybetmez"). Kare yine kayda göre
      // kapanır: v2_reconcile_frame bu kopyayı depoda bulur (durum 1b), iade etmez.
      // Kopya üç denemede de yazılamazsa görsel gerçekten elde yoktur: iade (durum 2).
      // Kopya yazıldıktan sonra bu fonksiyon düşerse kurtarma aynı kopyayı bulur.
      await saveOwnCopy(admin, userId, frame.id, images[0])
    }

    const { error } = await admin.rpc('v2_reconcile_frame', {
      p_frame_id: frame.id,
      p_error_code: res.ok ? null : errorCodeFrom(res.status, out),
    })
    if (error) console.error('v2_reconcile_frame failed', frame.id, error)
  } catch (e) {
    // Kare running kalır; kurtarma kaydına göre kapatır.
    console.error('run-frame-v2 failed', frame.id, e)
  }
}

async function download(admin: SupabaseClient, path: string, userId: string): Promise<Img> {
  if (!isOwnUpload(path, userId)) throw new Error('foreign_path')
  const mimeType = mimeFromPath(path)
  if (!mimeType) throw new Error('unsupported_type')
  const { data, error } = await admin.storage.from('user-assets').download(path)
  if (error || !data) throw error ?? new Error('missing')
  const bytes = new Uint8Array(await data.arrayBuffer())
  if (bytes.length === 0 || bytes.length > MAX_INPUT_BYTES) throw new Error('size')
  return { base64: toBase64(bytes), mimeType }
}

async function loadInputs(admin: SupabaseClient, p: CampaignParams, userId: string): Promise<LoadedInputs> {
  const cast = await download(admin, p.cast.path, userId)
  const products = await Promise.all(p.products.map(async (prod) => ({
    front: await download(admin, prod.front, userId),
    ...(prod.back ? { back: await download(admin, prod.back, userId) } : {}),
    ...(prod.detail ? { detail: await download(admin, prod.detail, userId) } : {}),
  })))
  const backgroundRef = p.background.refPath ? await download(admin, p.background.refPath, userId) : undefined
  return { cast, products, ...(backgroundRef ? { backgroundRef } : {}) }
}

// outputs/<kullanıcı>/v2/frames/<kare>.<uzantı>: kullanıcı imzalı adresle okuyabilir
// (kural: ilk klasör kullanıcı kimliği). generation_images'a yazılmaz; cleanup-expired
// bu dosyaya dokunmaz, v2 için ayrı saklama kuralı gerekecek (Kural 8).
// Yol ve uzantılar (png, jpg, webp) v2_reconcile_frame'deki aramayla aynı olmalı.
const COPY_ATTEMPTS = 3

async function saveOwnCopy(admin: SupabaseClient, userId: string, frameId: string, dataUrl: unknown): Promise<string | null> {
  const img = parseDataUrl(dataUrl)
  if (!img) {
    console.error('own copy skipped: unreadable image', frameId)
    return null
  }
  const path = `${userId}/v2/frames/${frameId}.${img.ext}`
  for (let attempt = 1; attempt <= COPY_ATTEMPTS; attempt++) {
    const { error } = await admin.storage.from('outputs').upload(path, img.bytes, { contentType: img.mime, upsert: true })
    if (!error) return path
    console.error('own copy upload failed', frameId, attempt, error)
    if (attempt < COPY_ATTEMPTS) await new Promise((r) => setTimeout(r, attempt * 1000))
  }
  return null
}
