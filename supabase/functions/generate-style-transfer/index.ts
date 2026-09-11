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

const TOOL = 'style_transfer'
const SYSTEM = 'many_markets'

async function decodeImageSource(src: string): Promise<{ mime: string; bytes: Uint8Array } | null> {
  const dataUrlMatch = src.match(/^data:([^;]+);base64,(.+)$/s)
  if (dataUrlMatch) {
    const mime = dataUrlMatch[1]
    const b64 = dataUrlMatch[2].replace(/\s/g, '')
    try {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      return { mime, bytes }
    } catch (e) {
      console.error('base64 decode failed', e)
      return null
    }
  }

  if (src.startsWith('http://') || src.startsWith('https://')) {
    try {
      const resp = await fetch(src)
      if (!resp.ok) {
        console.error('image fetch failed', resp.status, src.slice(0, 120))
        return null
      }
      const mime = resp.headers.get('content-type') ?? 'image/png'
      return { mime, bytes: new Uint8Array(await resp.arrayBuffer()) }
    } catch (e) {
      console.error('image fetch error', e)
      return null
    }
  }

  const trimmed = src.replace(/\s/g, '')
  if (trimmed.length > 64 && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
    try {
      const bytes = Uint8Array.from(atob(trimmed), (c) => c.charCodeAt(0))
      return { mime: 'image/png', bytes }
    } catch (e) {
      console.error('raw base64 decode failed', e)
      return null
    }
  }

  console.error('unrecognized image format', src.slice(0, 80))
  return null
}

async function saveGenerationImages(
  admin: ReturnType<typeof createClient>,
  userId: string,
  genId: string,
  images: string[],
  modelId: string | null,
): Promise<{ id: string; storage_path: string }[]> {
  const savedImages: { id: string; storage_path: string }[] = []

  for (let i = 0; i < images.length; i++) {
    try {
      const parsed = await decodeImageSource(images[i])
      if (!parsed) continue

      const { mime, bytes } = parsed
      const ext = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png'
      const path = `${userId}/${genId}/${i}.${ext}`

      const { error: upErr } = await admin.storage.from('outputs')
        .upload(path, bytes, { contentType: mime, upsert: true })
      if (upErr) { console.error('outputs upload failed', upErr); continue }

      const { data: imgRow, error: insErr } = await admin.from('generation_images').insert({
        generation_id: genId,
        user_id: userId,
        tool: TOOL,
        model_id: modelId,
        storage_path: path,
      }).select('id, storage_path').single()
      if (insErr) { console.error('generation_images insert failed', insErr); continue }
      if (imgRow) savedImages.push(imgRow)
    } catch (e) {
      console.error('image save failed', e)
    }
  }

  return savedImages
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
    const style = body.style as ImgInput
    const products: ImgInput[] = body.products ?? []
    const modelMode: string = body.modelMode ?? 'keep'   // 'keep' | 'product' | 'own' | 'ai'
    const modelImg = body.model as ImgInput | undefined
    const notes: string = (body.notes ?? '').toString().trim()
    const ratio: string = body.ratio ?? '2:3'
    const quality = body.quality === '2k' ? '2K' : '1K'
    const modelId: string | null = body.modelId ?? null

    if (!style?.base64 || products.length === 0) return json({ error: 'missing_input' }, 400)

    const useModelImg = (modelMode === 'own' || modelMode === 'ai') && !!modelImg?.base64
    if ((modelMode === 'own' || modelMode === 'ai') && !useModelImg) {
      return json({ error: 'missing_input' }, 400)
    }

    // Fiyat veritabanindan. Bugun tek kare uretiliyor, yani 1 kare x 1 kredi =
    // mevcut davranisla ayni; kare sayisi artinca fiyat kendiliginden olceklenir.
    const { data: sys } = await admin
      .from('systems').select('unit, price, is_active').eq('id', SYSTEM).single()
    if (!sys?.is_active) return json({ error: 'system_unavailable' }, 503)
    const framePrice = sys.price as number

    const { data: profile } = await admin.from('profiles').select('credits').eq('id', user.id).single()
    const balance = profile?.credits ?? 0
    if (balance < framePrice) return json({ error: 'insufficient_credits', balance, required: framePrice }, 402)

    const imageConfig = { aspectRatio: ratio, imageSize: quality }

    // --- 4 manken modu ---
    const modelText =
      modelMode === 'product'
        ? `PERSON: The PRODUCT image(s) show the item worn by a person. KEEP THAT PERSON from the product image — their face, hair, skin tone and body. Place them into the style reference's scene, adopting its pose, camera angle, framing, lighting and background EXACTLY. Do NOT use the person from the style reference. `
        : useModelImg
        ? `PERSON: Replace the person from the style reference with the person shown in the MODEL image (their face, hair, skin tone and body). Keep the style reference's pose, stance, camera angle, framing, lighting and background EXACTLY the same. `
        : `PERSON: Keep the SAME person from the style reference — same body, pose, stance, hands, hair and framing. Do NOT replace the person. `

    // --- moda gore "ne degisir" ---
    const changeText =
      modelMode === 'keep'
        ? `CHANGE ONLY: the merchandise (the garments/items worn). Everything else — including the person — stays exactly as in the reference. `
        : `CHANGE: (a) the PERSON, and (b) the merchandise (the garments/items worn). Everything else about the photograph stays exactly as in the reference. `

    // --- kisi degisen modlarda yeniden isiklandirma ---
    const relightText =
      modelMode === 'keep'
        ? ``
        : `RELIGHTING (critical): The new person must be RE-LIT to match the style reference's lighting exactly — the same light direction, intensity, softness, color temperature and shadows must fall on their face, skin, hair and body. Their face and skin must look naturally photographed on this set, with correct facial shadows, correct contact shadows on the ground/surface, and the same color grading as the reference. The person must NOT look pasted, cut out, flat, or lit differently from the scene. Blend them into the scene photorealistically. `

    const orderText = useModelImg
      ? `IMAGE ORDER: image 1 is the STYLE REFERENCE; image 2 is the MODEL; the remaining images are the PRODUCT items. `
      : `IMAGE ORDER: image 1 is the STYLE REFERENCE; the remaining images are the PRODUCT items. `

    const notesText = notes ? `Additional notes: ${notes}. ` : ''

    const text =
      `TASK: This is a PHOTO EDIT of an existing e-commerce catalogue photograph (the STYLE REFERENCE). ` +
      `Keep that photograph's scene EXACTLY as it is and change only what is specified below. ` +

      `PRESERVE FROM THE STYLE REFERENCE — these must be IDENTICAL, do not reinterpret: ` +
      `(1) POSE and body position: the exact same stance, gesture, limb positions and head angle — if the reference is seated, the output MUST be seated; if leaning, crouching or walking, keep it exactly. ` +
      `(2) CAMERA: the same shot distance and crop (wide / full-length / medium / close-up), the same camera height and angle (high angle, eye level, low angle), the same perspective and framing — do NOT zoom in, do NOT zoom out, do NOT recenter the subject. ` +
      `(3) COMPOSITION: the subject occupies the same position and the same scale within the frame; same negative space; same background alignment. ` +
      `(4) LIGHTING: the same light direction, intensity, softness/hardness, shadows, highlights, color temperature and overall color grading/mood. ` +
      `(5) BACKGROUND and ENVIRONMENT: identical setting, props, objects, textures and colors. ` +

      changeText +
      `Reproduce each product faithfully — exact design, cut, silhouette, color, fabric, pattern, prints and logos as shown in its image. Do not redesign, restyle or re-imagine the products; fit them naturally on the body with realistic drape and shadows consistent with the reference lighting. ` +

      modelText +
      relightText +
      orderText +
      notesText +

      `FINAL CHECK before output: pose, camera distance, camera angle, crop, composition, background and lighting must match the STYLE REFERENCE EXACTLY — as if the same photo were re-shot on the same set, with the same lighting rig and the same camera position. ` +
      `Commercial catalogue photograph: modest, tasteful and professional. Photorealistic, sharp, studio-grade quality; the person and the garments are naturally integrated into the scene's light.`

    // PARTS: tek text + gorseller (stil -> [manken] -> urunler)
    const parts: any[] = [
      { text },
      { inline_data: { mime_type: style.mimeType, data: style.base64 } },
    ]
    if (useModelImg && modelImg) {
      parts.push({ inline_data: { mime_type: modelImg.mimeType, data: modelImg.base64 } })
    }
    for (const p of products) {
      parts.push({ inline_data: { mime_type: p.mimeType, data: p.base64 } })
    }

    const result = await generateImage(parts, imageConfig)

    if (!result.image) {
      await admin.from('generations').insert({
        user_id: user.id, tool: TOOL, system: SYSTEM, status: 'failed',
        credits_charged: 0, image_count: 0,
        params: { modelMode, ratio, quality, productCount: products.length },
      })
      if (result.blocked) return json({ error: 'content_blocked' }, 422)
      if (result.httpError) return json({ error: 'model_busy' }, 503)
      return json({ error: 'generation_failed' }, 500)
    }

    const images = [result.image]

    await admin.rpc('deduct_credits', { p_user_id: user.id, p_amount: charged, p_tool: TOOL })
    const charged = framePrice * images.length
    const { data: genRow, error: genErr } = await admin.from('generations').insert({
      user_id: user.id, tool: TOOL, system: SYSTEM, status: 'success',
      credits_charged: charged, image_count: images.length,
      params: { modelMode, ratio, quality, productCount: products.length, modelId },
    }).select('id').single()

    if (genErr || !genRow?.id) {
      console.error('generations insert failed', genErr, 'genRow', genRow)
    }

    const savedImages = genRow?.id
      ? await saveGenerationImages(admin, user.id, genRow.id, images, modelId)
      : []

    return json({ images, creditsCharged: 1, savedImages })
  } catch (e) {
    console.error(e)
    return json({ error: 'server_error', detail: String(e) }, 500)
  }
})