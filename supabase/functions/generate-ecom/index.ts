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

type Angle = {
  base64: string
  mimeType: string
}

type ClothingInput = {
  base64?: string
  mimeType?: string
  notes?: string
  category?: string
  front?: Angle
  frontDetail?: Angle
  back?: Angle
  backDetail?: Angle
  detailBase64?: string
  detailMimeType?: string
}

type ImgInput = {
  base64: string
  mimeType: string
}

type PoseInput = {
  id: string
  prompt: string
  shot_type?: string | null
  direction?: string | null
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function framingText(shot?: string | null): string {
  if (shot === 'full_body')
    return `Camera framing: FULL-LENGTH SHOT — show the entire body from head to toe, including the feet and footwear, with a little space around the subject. `

  if (shot === 'medium_shot')
    return `Camera framing: MEDIUM SHOT — crop the frame from the top of the head down to roughly mid-thigh / just above the knees. The lower legs, feet and shoes are intentionally OUT OF FRAME and MUST NOT be visible. Do NOT zoom out, do NOT shrink the subject, and do NOT change the crop to include the shoes or feet. `

  if (shot === 'close_up')
    return `Camera framing: CLOSE-UP / UPPER-BODY SHOT — frame only the head, shoulders and upper torso (roughly waist-up). The lower body, legs, feet and shoes are intentionally OUT OF FRAME and MUST NOT be visible. Do NOT zoom out to include them. `

  return ''
}

function garmentsForShot(
  items: ClothingInput[],
  shot?: string | null
): ClothingInput[] {
  let filtered = items

  if (shot === 'medium_shot') {
    filtered = items.filter((c) => c.category !== 'shoes')
  } else if (shot === 'close_up') {
    filtered = items.filter(
      (c) => c.category !== 'shoes' && c.category !== 'bottom'
    )
  }

  return filtered.length > 0 ? filtered : items
}

/**
 * Gemini'nin gerçekten content/safety nedeniyle üretimi engellediğini
 * diğer "image üretmedi" durumlarından ayırır.
 *
 * OTHER, UNKNOWN, STOP vb. değerler tek başına content block kabul edilmez.
 */
function isSafetyBlocked(reason: unknown): boolean {
  if (typeof reason !== 'string') return false

  const safetyReasons = new Set([
    'SAFETY',
    'IMAGE_SAFETY',
    'PROHIBITED_CONTENT',
    'BLOCKLIST',
    'SPII',
  ])

  return safetyReasons.has(reason)
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function encodeBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

/**
 * Manken görselini yeniden kodlar: decode -> uzun kenarı %3 küçült -> JPEG q88.
 *
 * Neden: Gemini'nin giriş kontrolü (blockReason: OTHER) bazı görsellerin
 * ham piksellerine çok hassas; aynı görsel yeniden kodlanınca çoğu zaman geçiyor.
 * Bu SADECE sebebi belirsiz OTHER için kullanılır — gerçek safety block'ta
 * (SAFETY, PROHIBITED_CONTENT vb.) kullanılmaz.
 */
async function reencodeJpeg(img: ImgInput): Promise<ImgInput | null> {
  try {
    // Kütüphane sadece gerektiğinde yüklenir. Yüklenemezse yalnızca bu
    // yeniden-kodlama özelliği devre dışı kalır; fonksiyonun geri kalanı
    // çalışmaya devam eder (eski davranış: 422 no_image).
    const { Image } = await import('https://deno.land/x/imagescript@1.3.0/mod.ts')

    const decoded = await Image.decode(decodeBase64(img.base64))
    const scale = 0.97

    if (decoded.width >= decoded.height) {
      decoded.resize(Math.round(decoded.width * scale), Image.RESIZE_AUTO)
    } else {
      decoded.resize(Image.RESIZE_AUTO, Math.round(decoded.height * scale))
    }

    const out = await decoded.encodeJPEG(88)

    return { base64: encodeBase64(out), mimeType: 'image/jpeg' }
  } catch (e) {
    console.error('Model image re-encode failed', String(e))
    return null
  }
}

async function generateImage(
  parts: any[],
  imageConfig: Record<string, string>,
  models: string[] = [PRIMARY_MODEL, FALLBACK_MODEL]
) {
  let blocked = false
  let httpError = false

  for (const model of models) {
    const startKey = Math.floor(Math.random() * GEMINI_KEYS.length)

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt > 1) {
        await new Promise((r) => setTimeout(r, attempt * 800))
      }

      const key = GEMINI_KEYS[(startKey + attempt - 1) % GEMINI_KEYS.length]

      try {
        const resp = await fetch(modelUrl(model), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key,
          },
          body: JSON.stringify({
            contents: [{ parts }],
            safetySettings: SAFETY_SETTINGS,
            generationConfig: {
              imageConfig,
            },
          }),
        })

        /**
         * HTTP seviyesinde hata.
         * Örn: 400 / 401 / 403 / 429 / 500 vb.
         * Bunlar transient olabilir -> retry (continue) mantıklı.
         */
        if (!resp.ok) {
          httpError = true

          const errorText = await resp.text()

          console.error(
            'Gemini HTTP error',
            JSON.stringify({
              model,
              attempt,
              status: resp.status,
              response: errorText.slice(0, 4000),
            })
          )

          continue
        }

        const data = await resp.json()

        const cand = data?.candidates?.[0]

        /**
         * Önce image output'u ara.
         */
        const imgPart = (cand?.content?.parts ?? []).find(
          (p: any) => p?.inline_data ?? p?.inlineData
        )

        const inline = imgPart?.inline_data ?? imgPart?.inlineData

        if (inline?.data) {
          const mime =
            inline.mime_type ??
            inline.mimeType ??
            'image/png'

          console.log(
            'Gemini image success',
            JSON.stringify({
              model,
              attempt,
              mime,
            })
          )

          return {
            image: `data:${mime};base64,${inline.data}`,
            blocked: false,
            httpError: false,
          }
        }

        /**
         * Image gelmediyse gerçek nedeni ayır.
         */
        const blockReason = data?.promptFeedback?.blockReason
        const finishReason = cand?.finishReason

        const reason =
          blockReason ??
          finishReason ??
          'unknown'

        const safetyRatings = cand?.safetyRatings ?? []

        /**
         * Base64 image data'yı loglamıyoruz.
         * Sadece teşhis için gerekli metadata'yı logluyoruz.
         */
        console.error(
          'Gemini no image',
          JSON.stringify({
            model,
            attempt,
            reason,
            blockReason,
            finishReason,
            safetyRatings,
            hasCandidates: Array.isArray(data?.candidates)
              ? data.candidates.length > 0
              : false,
            candidateCount: Array.isArray(data?.candidates)
              ? data.candidates.length
              : 0,
            promptFeedback: data?.promptFeedback ?? null,
            responseKeys:
              data && typeof data === 'object'
                ? Object.keys(data)
                : [],
          })
        )

        /**
         * Gerçek safety/block reason ise content blocked olarak işaretle.
         * (OTHER / UNKNOWN burada blocked SAYILMAZ.)
         */
        if (
          isSafetyBlocked(blockReason) ||
          isSafetyBlocked(finishReason)
        ) {
          blocked = true

          console.error(
            'Gemini content blocked',
            JSON.stringify({
              model,
              attempt,
              blockReason,
              finishReason,
            })
          )
        }

        /**
         * Buraya geldiysek resp.ok'tı ama görsel GELMEDİ.
         *
         * Hem gerçek safety block hem de blockReason OTHER / unknown
         * AYNI girdiyle istikrarlı tekrar eder — aynı byte'ları bu modele
         * yeniden göndermek boşa çağrı (ve boşa maliyet).
         *
         * Bu yüzden bu modelde retry YAPMA; döngüyü kır ve bir sonraki
         * modele (fallback) geç. Flash, Pro'ya göre daha hoşgörülü olduğu
         * için tek anlamlı kademe odur.
         */
        break
      } catch (e) {
        httpError = true

        console.error(
          'Gemini request exception',
          JSON.stringify({
            model,
            attempt,
            error: String(e),
          })
        )

        /**
         * Exception transient olabilir -> retry devam eder.
         */
        continue
      }
    }

    /**
     * Not: Önceki kodda burada `if (blocked) break` olduğu için primary
     * bloklanınca fallback'e hiç geçilmiyordu. Artık her iki modeli de
     * (Pro -> Flash) deniyoruz; Flash daha hoşgörülü olduğu için bazı
     * görselleri kurtarabilir.
     */
  }

  return {
    image: undefined as string | undefined,
    blocked,
    httpError,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return json({ error: 'unauthorized' }, 401)
    }

    if (GEMINI_KEYS.length === 0) {
      return json(
        {
          error: 'server_error',
          detail: 'no gemini key',
        },
        500
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser()

    if (userErr || !user) {
      return json({ error: 'unauthorized' }, 401)
    }

    const admin = createClient(
      supabaseUrl,
      serviceKey
    )

    const body = await req.json()

    const model = body.model as ImgInput

    const clothing: ClothingInput[] =
      body.clothes ??
      body.clothing ??
      []

    const backgroundPrompt: string =
      body.backgroundPrompt ??
      body.background?.prompt ??
      ''

    const backgroundRef =
      body.backgroundRef as
        | {
            base64: string
            mimeType: string
          }
        | undefined

    const poses: PoseInput[] =
      body.poses ?? []

    const ratio: string =
      body.ratio ?? '3:4'

    const quality =
      body.quality === '2k'
        ? '2K'
        : '1K'

    const side: string =
      body.side === 'back'
        ? 'back'
        : 'front'

    const modelId: string | null =
      body.modelId ?? null

    const tuck: string | undefined =
      body.tuck

    const tuckText =
      tuck === 'out'
        ? `CRITICAL STYLING RULE (highest priority) — TOP FULLY UNTUCKED: The top garment (t-shirt / shirt / top) MUST be worn COMPLETELY UNTUCKED. It hangs loose and straight down and drapes OVER the waistband of the bottom (pants/skirt) on ALL sides — front, both sides AND back. Its hem falls naturally BELOW the waistline and fully covers the waistband, button and zipper of the bottoms, which stay hidden. It is NOT tucked in at ANY point: NOT fully, NOT partially, NOT at the front, NOT a half-tuck or "French tuck". Do not shorten, crop, gather, knot or roll the top. `
        : tuck === 'in'
          ? `CRITICAL STYLING RULE (highest priority) — TOP FULLY TUCKED IN: The top garment MUST be NEATLY and FULLY TUCKED INTO the waistband of the bottom (pants/skirt) all the way around (front, sides and back), so the waistband is clearly visible. A clean, deliberate, even tuck; it is NOT left hanging out anywhere. `
          : ''

    const tuckReminder =
      tuck === 'out'
        ? ` FINAL CHECK: the top stays COMPLETELY UNTUCKED and drapes over the waistband on every side; it is not tucked in even partially or at the front.`
        : tuck === 'in'
          ? ` FINAL CHECK: the top stays FULLY TUCKED IN all the way around.`
          : ''

    const stylingNotes = clothing
      .map((c) =>
        (c.notes ?? '')
          .toString()
          .trim()
      )
      .filter((n) => n.length > 0)

    const stylingText =
      stylingNotes.length
        ? `Apply these styling notes faithfully: ${stylingNotes.join(' | ')}. `
        : ''

    const pickMain = (
      c: ClothingInput
    ): Angle | undefined =>
      side === 'back'
        ? (
            c.back ??
            c.front ??
            (
              c.base64 && c.mimeType
                ? {
                    base64: c.base64,
                    mimeType: c.mimeType,
                  }
                : undefined
            )
          )
        : (
            c.front ??
            (
              c.base64 && c.mimeType
                ? {
                    base64: c.base64,
                    mimeType: c.mimeType,
                  }
                : undefined
            )
          )

    const pickDetail = (
      c: ClothingInput
    ): Angle | undefined =>
      side === 'back'
        ? c.backDetail
        : (
            c.frontDetail ??
            (
              c.detailBase64 &&
              c.detailMimeType
                ? {
                    base64: c.detailBase64,
                    mimeType: c.detailMimeType,
                  }
                : undefined
            )
          )

    const hasDetail =
      clothing.some((c) => !!pickDetail(c))

    const logoText = hasDetail
      ? `LOGO / PRINT FIDELITY (very important): One or more garments carry a printed logo, graphic or text. A separate CLOSE-UP reference image of that print is provided. You MUST reproduce the logo/print/graphic/text EXACTLY as in the close-up reference — identical shapes, letters, spelling, proportions, colors and placement. Do NOT redraw, restyle, translate, invent, distort, mirror or "improve" it. Treat the print as a fixed graphic that is copied faithfully onto the garment, following the fabric's natural folds and lighting. Keep all text legible and correct. If any letters, characters or fine details are ambiguous in the garment photo, ALWAYS defer to the close-up reference image as the source of truth for the logo/print. Render the print at high resolution with crisp, sharp edges. `
      : `If any garment has a printed logo, graphic or text, reproduce it faithfully and legibly; do not redraw or distort it. `

    if (
      !model?.base64 ||
      clothing.length === 0 ||
      poses.length === 0
    ) {
      return json(
        {
          error: 'missing_input',
        },
        400
      )
    }

    // Sistem ve fiyat.
    // Taksonomi istemciden gelebilir, fiyat GELMEZ:
    // fiyat her zaman veritabanından okunur.
    //
    // Bu motor iki sistemi birden besliyor;
    // bugünkü arayüz system alanı göndermiyor,
    // o yüzden varsayılan ghost_to_campaign
    // (mevcut davranışla aynı fiyat).

    const systemId =
      body.system === 'rebuild_shoot'
        ? 'rebuild_shoot'
        : 'ghost_to_campaign'

    const {
      data: sys,
      error: sysErr,
    } = await admin
      .from('systems')
      .select('unit, price, is_active')
      .eq('id', systemId)
      .single()

    if (sysErr) {
      console.error(
        'systems read failed',
        sysErr
      )

      return json(
        {
          error: 'server_error',
          detail: 'price_lookup_failed',
        },
        500
      )
    }

    if (!sys?.is_active) {
      return json(
        {
          error: 'system_unavailable',
        },
        503
      )
    }

    const framePrice =
      sys.price as number

    const required =
      framePrice * poses.length

    const {
      data: profile,
      error: profileErr,
    } = await admin
      .from('profiles')
      .select('credits')
      .eq('id', user.id)
      .single()

    if (profileErr) {
      console.error(
        'profiles read failed',
        user.id,
        profileErr
      )

      return json(
        {
          error: 'server_error',
          detail: 'balance_lookup_failed',
        },
        500
      )
    }

    const balance =
      profile?.credits ?? 0

    if (balance < required) {
      return json(
        {
          error: 'insufficient_credits',
          balance,
          required,
        },
        402
      )
    }

    const effectiveQuality =
      hasDetail
        ? '2K'
        : quality

    const imageConfig = {
      aspectRatio: ratio,
      imageSize: effectiveQuality,
    }

    // Manken görselinin yeniden kodlanmış hali — istek başına EN FAZLA bir kez
    // hesaplanır, birden fazla pose aynı sonucu paylaşır.
    let reencodedModelPromise: Promise<ImgInput | null> | null = null
    const getReencodedModel = () =>
      (reencodedModelPromise ??= reencodeJpeg(model))

    async function forPose(
      pose: PoseInput
    ) {
      const shot =
        pose.shot_type ?? null

      const garments =
        garmentsForShot(
          clothing,
          shot
        )

      const frame =
        framingText(shot)

      const sideText =
        side === 'back'
          ? `VIEW: Show the BACK of the outfit — the model is seen from BEHIND, back turned to the camera. `
          : ''

      const backgroundText =
        backgroundRef
          ? `BACKGROUND/SCENE: A reference image of the exact background scene is provided. Reproduce the SAME background — identical setting, props and objects (e.g. furniture like a chair), colors, textures and lighting — from that reference. IGNORE any person or pose that may appear in the background reference; use ONLY its scene/environment, and place the actual model (from the model image) into it. ${
              backgroundPrompt
                ? `Scene notes: ${backgroundPrompt}. `
                : ''
            }`
          : (
              backgroundPrompt
                ? `Background/scene: ${backgroundPrompt}. `
                : `Clean studio background. `
            )

      const text =
        `Create a professional, high-end e-commerce fashion product photo. ` +
        `Use the provided model image as the person; dress this exact person in the provided clothing item(s), ` +
        `keeping each garment's design, color, pattern and details faithful. ` +
        tuckText +
        logoText +
        sideText +
        `Pose: ${pose.prompt}. ` +
        frame +
        backgroundText +
        stylingText +
        `The model is modest, tasteful and fully clothed. Photorealistic, sharp, professional studio lighting, natural fit and drape.` +
        tuckReminder

      const parts: any[] = [
        {
          text,
        },
        {
          inline_data: {
            mime_type: model.mimeType,
            data: model.base64,
          },
        },
      ]

      if (backgroundRef?.base64) {
        parts.push({
          text: `Background scene reference (use its environment and objects; ignore any person in it):`,
        })

        parts.push({
          inline_data: {
            mime_type: backgroundRef.mimeType,
            data: backgroundRef.base64,
          },
        })
      }

      for (const c of garments) {
        const main =
          pickMain(c)

        if (!main) continue

        parts.push({
          inline_data: {
            mime_type: main.mimeType,
            data: main.base64,
          },
        })

        const detail =
          pickDetail(c)

        if (detail) {
          parts.push({
            text: `Close-up reference of the exact logo/print on the previous garment — copy it EXACTLY:`,
          })

          parts.push({
            inline_data: {
              mime_type: detail.mimeType,
              data: detail.base64,
            },
          })
        }
      }

      console.log(
        'Gemini request inputs',
        JSON.stringify({
          poseId: pose.id,
          shot,
          modelId,
          images: parts
            .filter((p) => p.inline_data)
            .map((p, i) => ({
              index: i,
              mime: p.inline_data.mime_type,
              sizeKB: Math.round((p.inline_data.data.length * 3) / 4 / 1024),
            })),
        })
      )

      // 1) Orijinal görselle: önce Pro, Pro'dan görsel gelmezse Flash.
      const result = await generateImage(
        parts,
        imageConfig
      )

      /**
       * Görsel geldiyse, gerçek safety block varsa ya da HTTP hatası varsa
       * olduğu gibi dön. Sadece "resp.ok ama görsel yok" (blockReason OTHER)
       * durumunda manken görselini yeniden kodlayıp BİR kez daha dene.
       */
      if (result.image || result.blocked || result.httpError) {
        return result
      }

      const alt = await getReencodedModel()

      if (!alt) {
        return result
      }

      console.log(
        'Retrying with re-encoded model image',
        JSON.stringify({
          poseId: pose.id,
          modelId,
          sizeKB: Math.round((alt.base64.length * 3) / 4 / 1024),
        })
      )

      // parts[1] her zaman manken görseli (parts[0] metin prompt).
      const retryParts = [...parts]
      retryParts[1] = {
        inline_data: {
          mime_type: alt.mimeType,
          data: alt.base64,
        },
      }

      // 2) Yeniden kodlanmış görselle de öncelik Pro; Pro'dan görsel gelmezse Flash.
      const retry = await generateImage(
        retryParts,
        imageConfig,
        [PRIMARY_MODEL, FALLBACK_MODEL]
      )

      return retry.image ? retry : result
    }

    const settled =
      await Promise.all(
        poses.map(forPose)
      )

    const images =
      settled
        .filter((s) => s.image)
        .map((s) => s.image as string)

    const blockedAny =
      settled.some(
        (s) => s.blocked
      )

    const httpErrorAny =
      settled.some(
        (s) => s.httpError
      )

    const successCount =
      images.length

    const charged =
      framePrice * successCount

    // Kredi dusmezse gorseller teslim edilmez:
    // hatayi yutmak bedava uretim demek.

    if (successCount > 0) {
      const {
        error: deductErr,
      } = await admin.rpc(
        'deduct_credits',
        {
          p_user_id: user.id,
          p_amount: charged,
          p_tool: 'ecom_studio',
        }
      )

      if (deductErr) {
        console.error(
          'deduct_credits failed',
          user.id,
          deductErr
        )

        return json(
          {
            error: 'credit_charge_failed',
          },
          402
        )
      }
    }

    const {
      data: genRow,
      error: genErr,
    } = await admin
      .from('generations')
      .insert({
        user_id: user.id,
        tool: 'ecom_studio',
        system: systemId,
        status:
          successCount === 0
            ? 'failed'
            : 'success',
        credits_charged: charged,
        image_count: successCount,
        params: {
          poses: poses.map(
            (p) => p.id
          ),
          ratio,
          quality:
            effectiveQuality,
          tuck:
            tuck ?? null,
          side,
          hasBgRef:
            !!backgroundRef,
          stylingNotes,
          modelId,
        },
      })
      .select('id')
      .single()

    if (genErr) {
      console.error(
        'generations insert failed',
        user.id,
        genErr
      )
    }

    // Üretilen görselleri kalıcı depoya kaydet
    // (hata olursa akışı bozma)

    const savedImages: {
      id: string
      storage_path: string
    }[] = []

    if (genRow?.id) {
      for (
        let i = 0;
        i < images.length;
        i++
      ) {
        try {
          const dataUrl =
            images[i]

          const m =
            dataUrl.match(
              /^data:(.+?);base64,(.+)$/
            )

          if (!m) continue

          const mime = m[1]

          const ext =
            mime.includes('jpeg')
              ? 'jpg'
              : mime.includes('webp')
                ? 'webp'
                : 'png'

          const bytes =
            Uint8Array.from(
              atob(m[2]),
              (c) =>
                c.charCodeAt(0)
            )

          const path =
            `${user.id}/${genRow.id}/${i}.${ext}`

          const {
            error: upErr,
          } = await admin.storage
            .from('outputs')
            .upload(
              path,
              bytes,
              {
                contentType: mime,
                upsert: true,
              }
            )

          if (upErr) {
            console.error(
              'outputs upload failed',
              upErr
            )
            continue
          }

          const {
            data: imgRow,
            error: insErr,
          } = await admin
            .from(
              'generation_images'
            )
            .insert({
              generation_id:
                genRow.id,
              user_id:
                user.id,
              tool:
                'ecom_studio',
              model_id:
                modelId,
              storage_path:
                path,
            })
            .select(
              'id, storage_path'
            )
            .single()

          if (insErr) {
            console.error(
              'generation_images insert failed',
              insErr
            )
            continue
          }

          if (imgRow) {
            savedImages.push(
              imgRow
            )
          }
        } catch (e) {
          console.error(
            'image save failed',
            e
          )
        }
      }
    }

    if (successCount === 0) {
      if (blockedAny) {
        return json(
          {
            error:
              'content_blocked',
          },
          422
        )
      }

      if (httpErrorAny) {
        return json(
          {
            error:
              'model_busy',
          },
          503
        )
      }

      // resp.ok'tı, safety block yok, HTTP hatası yok ama görsel gelmedi.
      // Büyük ihtimalle girdi görseli Gemini'nin giriş kontrolüne takıldı
      // (promptFeedback.blockReason: OTHER). Bu BEKLENEN bir durum, sunucu
      // hatası değil — 500 yerine 422 dönüyoruz ki console'a EDGE_FUNCTION_ERROR
      // düşmesin ve frontend'de "bu foto işlenemedi" mesajına bağlanabilsin.
      return json(
        {
          error: 'no_image',
        },
        422
      )
    }

    return json({
      images,
      creditsCharged:
        successCount,
      savedImages,
    })
  } catch (e) {
    console.error(e)

    return json(
      {
        error: 'server_error',
        detail: String(e),
      },
      500
    )
  }
})
