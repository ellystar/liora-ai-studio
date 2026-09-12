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

type Angle = { base64: string; mimeType: string }
type ClothingInput = {
  base64?: string; mimeType?: string; notes?: string; category?: string
  front?: Angle; frontDetail?: Angle; back?: Angle; backDetail?: Angle
}
type ImgInput = { base64: string; mimeType: string }
type PoseInput = { id: string; prompt: string; shot_type?: string | null; direction?: string | null }

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function framingText(shot?: string | null): string {
  if (shot === 'full_body')
    return `Camera framing: FULL-LENGTH SHOT — show the entire body from head to toe, including the feet and footwear. `
  if (shot === 'medium_shot')
    return `Reframe as a MEDIUM SHOT — crop from the top of the head down to roughly mid-thigh / just above the knees. The lower legs, feet and shoes MUST NOT be visible. Do NOT zoom out or change the crop to include the feet or shoes. `
  if (shot === 'close_up')
    return `Reframe as a CLOSE-UP shot focusing tightly on the referenced area. `
  return ''
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
    const poses: PoseInput[] = body.poses ?? []
    const tuck: string | undefined = body.tuck
    const side: string = body.side === 'back' ? 'back' : 'front'
    const modelId: string | null = body.modelId ?? null
    const clothing: ClothingInput[] = body.clothes ?? []
    if (!photo?.base64 || poses.length === 0) return json({ error: 'missing_input' }, 400)

    const tuckText =
      tuck === 'out'
        ? `CRITICAL: keep the top garment COMPLETELY UNTUCKED exactly as intended — it hangs loose and drapes OVER the waistband of the bottoms on ALL sides (front, sides and back), fully covering the waistband. Do NOT tuck it in at any point: not fully, not partially, not at the front, no half-tuck or "French tuck". `
        : tuck === 'in'
        ? `CRITICAL: keep the top garment FULLY TUCKED INTO the waistband all the way around (front, sides and back); do NOT leave it hanging out anywhere. `
        : ``

    const isBackHero = side === 'back' && clothing.length > 0
    const backGarments = clothing.filter((c) => c.back || c.backDetail)
    const anyBackMissing = clothing.some((c) => !c.back)
    const sideText = side === 'back'
      ? `Rotate the SAME person, outfit, lighting and background so the model is now seen from BEHIND (back turned to camera), showing the BACK of the outfit. Keep identity, hair, garments, colors, scene and lighting IDENTICAL to the reference photo — only the viewpoint changes to the back. ${isBackHero ? (anyBackMissing ? 'For garments without a dedicated back reference, infer a plausible clean back consistent with the front. ' : 'Use the provided BACK-VIEW garment reference image(s) faithfully for the back design, seams and prints. ') : ''}`
      : ''

    const { data: profile, error: profileErr } = await admin.from('profiles').select('credits').eq('id', user.id).single()
    if (profileErr) {
      console.error('profiles read failed', user.id, profileErr)
      return json({ error: 'server_error', detail: 'balance_lookup_failed' }, 500)
    }
    const balance = profile?.credits ?? 0
    if (balance < poses.length) return json({ error: 'insufficient_credits', balance, required: poses.length }, 402)

    const imageConfig = { imageSize: '2K' }

    async function forPose(pose: PoseInput) {
      const frame = framingText(pose.shot_type ?? null)
      const text = side === 'back'
        ? `You are given a photo of a person (front view reference). ${sideText}Change the pose to: ${pose.prompt}. ${frame}${tuckText}Photorealistic, studio quality.`
        : `You are given a photo of a person. Recreate the exact same person, outfit, background and lighting, ` +
          `but change ONLY the pose to: ${pose.prompt}. ${frame}${tuckText}` +
          `Keep identity, face, clothing, colors and scene identical. Photorealistic, studio quality.`

      const parts: any[] = [{ text }, { inline_data: { mime_type: photo.mimeType, data: photo.base64 } }]

      if (isBackHero) {
        for (const c of backGarments) {
          if (c.back) parts.push({ inline_data: { mime_type: c.back.mimeType, data: c.back.base64 } })
          if (c.backDetail) {
            parts.push({ text: `Close-up reference of the exact back logo/print on the previous garment — copy it EXACTLY, keep every letter sharp and legible:` })
            parts.push({ inline_data: { mime_type: c.backDetail.mimeType, data: c.backDetail.base64 } })
          }
        }
      }
      return generateImage(parts, imageConfig)
    }

    const settled = await Promise.all(poses.map(forPose))
    const images = settled.filter((s) => s.image).map((s) => s.image as string)
    const successCount = images.length
    // Kredi dusmezse gorseller teslim edilmez.
    if (successCount > 0) {
      const { error: deductErr } = await admin.rpc('deduct_credits', { p_user_id: user.id, p_amount: successCount, p_tool: 'pose_generator' })
      if (deductErr) {
        console.error('deduct_credits failed', user.id, deductErr)
        return json({ error: 'credit_charge_failed' }, 402)
      }
    }
    const { data: genRow, error: genErr } = await admin.from('generations').insert({
      user_id: user.id, tool: 'pose_generator', status: successCount === 0 ? 'failed' : 'success',
      credits_charged: successCount, image_count: successCount, params: { poses: poses.map((p) => p.id), side, modelId },
    }).select('id').single()
    if (genErr) console.error('generations insert failed', user.id, genErr)

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
            tool: 'pose_generator',
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

    if (successCount === 0) {
      if (settled.some((s) => s.blocked)) return json({ error: 'content_blocked' }, 422)
      if (settled.some((s) => s.httpError)) return json({ error: 'model_busy' }, 503)
      return json({ error: 'generation_failed' }, 500)
    }
    return json({ images, creditsCharged: successCount, savedImages })
  } catch (e) {
    console.error(e)
    return json({ error: 'server_error', detail: String(e) }, 500)
  }
})