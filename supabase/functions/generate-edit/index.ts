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
].filter(Boolean) as string[]

const ALLOWED_RATIOS = ['1:1', '2:3', '3:4', '4:3']

type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function generateImage(
  parts: Part[],
  imageConfig: Record<string, unknown>,
): Promise<{ image?: string; blocked?: boolean; httpError?: boolean }> {
  for (const model of [PRIMARY_MODEL, FALLBACK_MODEL]) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const key = GEMINI_KEYS[attempt % GEMINI_KEYS.length]
      if (!key) continue
      try {
        const res = await fetch(modelUrl(model), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { responseModalities: ['IMAGE'], imageConfig },
            safetySettings: SAFETY_SETTINGS,
          }),
        })

        if (!res.ok) {
          // icerik blogu degil; kapasite/HTTP hatasi -> tekrar dene, sonra fallback
          if (attempt === 2) break
          await new Promise((r) => setTimeout(r, attempt * 800))
          continue
        }

        const data = await res.json()
        const cand = data?.candidates?.[0]
        if (cand?.finishReason === 'SAFETY' || cand?.finishReason === 'PROHIBITED_CONTENT') {
          return { blocked: true } // icerik blogu -> fallback yok
        }
        const imgPart = cand?.content?.parts?.find((p: any) => p.inlineData?.data)
        if (imgPart?.inlineData?.data) {
          return { image: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}` }
        }
        // gorsel yok ama blok da degil -> tekrar dene
        if (attempt === 2) break
        await new Promise((r) => setTimeout(r, attempt * 800))
      } catch {
        if (attempt === 2) break
        await new Promise((r) => setTimeout(r, attempt * 800))
      }
    }
  }
  return { httpError: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json()
    const images = body.images as { base64: string; mimeType: string }[] | undefined
    const message = (body.message as string | undefined)?.trim()
    const ratio = body.ratio as string | undefined
    const quality = (body.quality as string | undefined) ?? '1k'
    const modelId: string | null = body.modelId ?? null

    if (!images?.length || !message) {
      return json({ error: 'missing_input' }, 400)
    }

    // bakiye on-kontrol
    const { data: profile, error: profileErr } = await admin
      .from('profiles').select('credits').eq('id', user.id).single()
    if (profileErr) {
      console.error('profiles read failed', user.id, profileErr)
      return json({ error: 'server_error', detail: 'balance_lookup_failed' }, 500)
    }
    if (!profile || profile.credits < 1) {
      return json({ error: 'insufficient_credits' }, 402)
    }

    // parts: gorseller + duzenleme metni
    const parts: Part[] = images.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.base64 },
    }))
    parts.push({ text: message })

    const imageConfig: Record<string, unknown> = { imageSize: quality }
    if (ratio && ratio !== 'original' && ALLOWED_RATIOS.includes(ratio)) {
      imageConfig.aspectRatio = ratio
    }

    const result = await generateImage(parts, imageConfig)

    if (result.blocked) return json({ error: 'content_blocked' }, 422)
    if (!result.image) return json({ error: 'model_busy' }, 503)

    // krediyi dus + kaydet
    // Kredi dusmezse gorsel teslim edilmez.
    const { error: deductErr } = await admin.rpc('deduct_credits', { p_user_id: user.id, p_amount: 1, p_tool: 'edit_photo' })
    if (deductErr) {
      console.error('deduct_credits failed', user.id, deductErr)
      return json({ error: 'credit_charge_failed' }, 402)
    }
    // NOT: burada eskiden 'credits_used' yaziliyordu — generations tablosunda
    // boyle bir kolon yok, dolayisiyla insert sessizce dusuyor ve edit_photo
    // uretimleri hic kaydedilmiyordu. Dogru kolon credits_charged.
    // system bilerek yazilmiyor: edit_photo bir sistemin parcasi degil.
    const { data: genRow, error: genErr } = await admin.from('generations').insert({
      user_id: user.id, tool: 'edit_photo', status: 'success',
      credits_charged: 1, image_count: 1,
    }).select('id').single()
    if (genErr) console.error('generations insert failed', user.id, genErr)

    const outputImages = [result.image]

    // Üretilen görselleri kalıcı depoya kaydet (hata olursa akışı bozma)
    const savedImages: { id: string; storage_path: string }[] = []
    if (genRow?.id) {
      for (let i = 0; i < outputImages.length; i++) {
        try {
          const dataUrl = outputImages[i]
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
            tool: 'edit_photo',
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

    return json({ images: outputImages, savedImages })
  } catch (e) {
    return json({ error: 'server_error', detail: String(e) }, 500)
  }
})