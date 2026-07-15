import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PRIMARY_MODEL = 'gemini-3-pro-image'
const FALLBACK_MODEL = 'gemini-3.1-flash-image'
const modelUrl = (m: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
]

const GEMINI_KEYS = [
  Deno.env.get('GEMINI_API_KEY'),
  Deno.env.get('GEMINI_API_KEY_2'),
].filter((k): k is string => !!k)

type ImgInput = { base64: string; mimeType: string }

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function generateImage(parts: any[], imageConfig: Record<string, string>) {
  let blocked = false
  let httpError = false
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    const startKey = Math.floor(Math.random() * GEMINI_KEYS.length)
    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt > 1) await new Promise((r) => setTimeout(r, attempt * 800))
      const key = GEMINI_KEYS[(startKey + attempt - 1) % GEMINI_KEYS.length]
      const resp = await fetch(modelUrl(model), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts }], safetySettings: SAFETY_SETTINGS, generationConfig: { imageConfig } }),
      })
      if (!resp.ok) {
        httpError = true
        console.error('Gemini HTTP', model, attempt, resp.status, await resp.text())
        continue
      }
      const data = await resp.json()
      const cand = data?.candidates?.[0]
      const imgPart = (cand?.content?.parts ?? []).find((p: any) => p.inline_data ?? p.inlineData)
      const inline = imgPart?.inline_data ?? imgPart?.inlineData
      if (inline?.data) {
        const mime = inline.mime_type ?? inline.mimeType ?? 'image/png'
        return { image: `data:${mime};base64,${inline.data}`, blocked: false, httpError: false }
      }
      const reason = data?.promptFeedback?.blockReason ?? cand?.finishReason ?? 'unknown'
      console.error('Gemini no image', model, JSON.stringify({ attempt, reason }))
      if (reason !== 'unknown') { blocked = true; break }
    }
    if (blocked) break
  }
  return { image: undefined as string | undefined, blocked, httpError }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'unauthorized' }, 401)
    if (GEMINI_KEYS.length === 0) return json({ error: 'server_error', detail: 'no gemini key' }, 500)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return json({ error: 'unauthorized' }, 401)
    const admin = createClient(supabaseUrl, serviceKey)

    const body = await req.json()
    const photo = body.photo as ImgInput
    const bgPrompt: string = body.backgroundPrompt ?? body.background?.prompt ?? ''
    const ratio: string | undefined = body.ratio
    const modelId: string | null = body.modelId ?? null
    if (!photo?.base64) return json({ error: 'missing_input' }, 400)

    const { data: profile } = await admin.from('profiles').select('credits').eq('id', user.id).single()
    const balance = profile?.credits ?? 0
    if (balance < 1) return json({ error: 'insufficient_credits', balance, required: 1 }, 402)

    const text =
      `You are given a flat-lay / flat product photo of a clothing item. Render it as a professional e-commerce ` +
      `GHOST MANNEQUIN product photo (invisible mannequin effect): the garment filled out and shaped as if worn by an ` +
      `invisible person, natural volume and drape, no visible mannequin or body. ` +
      (bgPrompt ? `Background: ${bgPrompt}. ` : `Clean studio background. `) +
      `Photorealistic, high-detail, sharp, professional studio lighting.`
    const parts = [{ text }, { inline_data: { mime_type: photo.mimeType, data: photo.base64 } }]

    const imageConfig: Record<string, string> = { imageSize: '2K' }
    if (ratio) imageConfig.aspectRatio = ratio

    const r = await generateImage(parts, imageConfig)
    if (r.image) {
      await admin.rpc('deduct_credits', { p_user_id: user.id, p_amount: 1, p_tool: 'flat_to_ghost' })
      const { data: genRow } = await admin.from('generations').insert({
        user_id: user.id, tool: 'flat_to_ghost', status: 'success', credits_charged: 1, image_count: 1,
        params: { ratio: ratio ?? null, modelId },
      }).select('id').single()

      const images = [r.image]

      // Üretilen görselleri kalıcı depoya kaydet (hata olursa akışı bozma)
      const savedImages: { id: string; storage_path: string }[] = []
      if (genRow?.id) {
        for (let i = 0; i < images.length; i++) {
          try {
            const dataUrl = images[i]
            const m = dataUrl.match(/^data:(.+?);base64,(.+)$/)
            if (!m) continue
            const mime = m[1]
            const ext = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png'
            const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0))
            const path = `${user.id}/${genRow.id}/${i}.${ext}`

            const { error: upErr } = await admin.storage.from('outputs')
              .upload(path, bytes, { contentType: mime, upsert: true })
            if (upErr) { console.error('outputs upload failed', upErr); continue }

            const { data: imgRow, error: insErr } = await admin.from('generation_images').insert({
              generation_id: genRow.id,
              user_id: user.id,
              tool: 'flat_to_ghost',
              model_id: modelId,
              storage_path: path,
            }).select('id, storage_path').single()
            if (insErr) { console.error('generation_images insert failed', insErr); continue }
            if (imgRow) savedImages.push(imgRow)
          } catch (e) {
            console.error('image save failed', e)
          }
        }
      }

      return json({ images, creditsCharged: 1, savedImages })
    }
    await admin.from('generations').insert({ user_id: user.id, tool: 'flat_to_ghost', status: 'failed', credits_charged: 0, image_count: 0, params: { ratio: ratio ?? null } })
    if (r.blocked) return json({ error: 'content_blocked' }, 422)
    if (r.httpError) return json({ error: 'model_busy' }, 503)
    return json({ error: 'generation_failed' }, 500)
  } catch (e) {
    console.error(e)
    return json({ error: 'server_error', detail: String(e) }, 500)
  }
})
