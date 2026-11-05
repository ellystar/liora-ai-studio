// v2 · Ghost'tan Kampanyaya: istek doğrulama ve generate-ecom eşlemesi.
// Sözleşme: "Ghost'tan Kampanyaya → generate-ecom", K15, K16.
// Saf fonksiyonlar (ağ ve veritabanı yok); start-run-v2 ve run-frame-v2 paylaşır.
// İlk sürüm: tek kare. Zincir (ilk kareden generate-pose) sonraki parça.

export const SYSTEM_ID = 'ghost_to_campaign'
export const CATEGORIES = ['top', 'bottom', 'outer', 'onepiece', 'shoes', 'acc'] as const
export const RATIOS = ['2:3', '4:5', '3:4', '1:1', '9:16'] as const
export const SHOT_TYPES = ['full_body', 'medium_shot', 'close_up'] as const
export const MAX_PRODUCTS = 4
export const MAX_FRAMES = 1
export const MAX_TEXT = 600
export const MAX_TITLE = 120

export type Category = (typeof CATEGORIES)[number]
export type Ratio = (typeof RATIOS)[number]
export type ShotType = (typeof SHOT_TYPES)[number]

// v2 kategorisi -> generate-ecom kategorisi (sözleşmedeki eşleme)
export const ECOM_CATEGORY: Record<Category, string> = {
  top: 'top',
  bottom: 'bottom',
  outer: 'outerwear',
  onepiece: 'onepiece',
  shoes: 'shoes',
  acc: 'accessory',
}

// Dosya yolları "user-assets" kovasında, kullanıcının kendi klasöründe:
// <kullanıcı>/v2/uploads/<dosya>. Depolama kuralı ilk klasörün kullanıcı kimliği olmasını istiyor.
export type Product = { category: Category; front: string; back?: string; detail?: string }
export type FrameSpec = { key: string; prompt: string; shotType: ShotType | null; side: 'front' | 'back' }

export type CampaignInput = {
  version: 1
  cast: { path: string }
  products: Product[]
  tuck: 'in' | 'out' | null
  background: { prompt: string | null; refPath: string | null }
  ratio: Ratio
  frames: FrameSpec[]
  system: typeof SYSTEM_ID
  quality: '2k' // küçük harf (Kural 7); sunucu Gemini'ye '2K' olarak çevirir
}
// İşin anlık görüntüsü (jobs.params). price: işin açıldığı andaki kare fiyatı (systems).
export type CampaignParams = CampaignInput & { price: number }

export type Img = { base64: string; mimeType: string }
export type LoadedInputs = {
  cast: Img
  products: { front: Img; back?: Img; detail?: Img }[]
  backgroundRef?: Img
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const FILE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.(png|jpe?g|webp)$/i
const KEY_RE = /^[A-Za-z0-9._:-]{1,64}$/
const ERROR_RE = /^[a-z_]{1,40}$/

export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v)

// Sunucu dosyaları service role ile indirir; bu yüzden yol mutlaka çağıranın kendi
// klasöründe olmalı, yoksa başkasının dosyası okunabilirdi.
export function isOwnUpload(path: unknown, userId: string): path is string {
  if (typeof path !== 'string') return false
  const prefix = `${userId}/v2/uploads/`
  return path.startsWith(prefix) && FILE_RE.test(path.slice(prefix.length))
}

export function mimeFromPath(path: string): string | null {
  const ext = path.split('.').pop()?.toLowerCase()
  if (ext === 'png') return 'image/png'
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  return null
}

const has = (v: unknown) => v !== undefined && v !== null

function optText(v: unknown, max: number): { ok: true; value: string | null } | { ok: false } {
  if (!has(v)) return { ok: true, value: null }
  if (typeof v !== 'string') return { ok: false }
  const t = v.trim()
  if (t.length > max) return { ok: false }
  return { ok: true, value: t.length ? t : null }
}

export type ParseResult =
  | { ok: true; title: string; setupId: string | null; input: CampaignInput }
  | { ok: false; field: string }

export function parseCampaignInput(body: unknown, userId: string): ParseResult {
  const fail = (field: string): ParseResult => ({ ok: false, field })
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('body')
  const b = body as Record<string, unknown>
  if (b.flow !== 'campaign') return fail('flow')

  const title = optText(b.title, MAX_TITLE)
  if (!title.ok) return fail('title')
  if (has(b.setupId) && !isUuid(b.setupId)) return fail('setupId')
  const setupId = isUuid(b.setupId) ? b.setupId : null

  const cast = b.cast as Record<string, unknown> | null | undefined
  const castPath = cast && typeof cast === 'object' ? cast.path : undefined
  if (!isOwnUpload(castPath, userId)) return fail('cast')

  if (!Array.isArray(b.products) || b.products.length === 0 || b.products.length > MAX_PRODUCTS) {
    return fail('products')
  }
  const products: Product[] = []
  for (let i = 0; i < b.products.length; i++) {
    const p = b.products[i] as Record<string, unknown> | null
    if (!p || typeof p !== 'object') return fail(`products[${i}]`)
    const category = p.category
    if (!CATEGORIES.includes(category as Category)) return fail(`products[${i}].category`)
    const front = p.front
    if (!isOwnUpload(front, userId)) return fail(`products[${i}].front`)
    const item: Product = { category: category as Category, front }
    const back = p.back
    if (has(back)) {
      if (!isOwnUpload(back, userId)) return fail(`products[${i}].back`)
      item.back = back
    }
    const detail = p.detail
    if (has(detail)) {
      if (!isOwnUpload(detail, userId)) return fail(`products[${i}].detail`)
      item.detail = detail
    }
    products.push(item)
  }

  // Üst içeride / dışarıda yalnızca üst ve alt birlikteyse gönderilir.
  if (has(b.tuck) && b.tuck !== 'in' && b.tuck !== 'out') return fail('tuck')
  const topAndBottom = products.some((p) => p.category === 'top') && products.some((p) => p.category === 'bottom')
  const tuck = (b.tuck === 'in' || b.tuck === 'out') && topAndBottom ? b.tuck : null

  let background: CampaignInput['background'] = { prompt: null, refPath: null }
  if (has(b.background)) {
    if (typeof b.background !== 'object') return fail('background')
    const bg = b.background as Record<string, unknown>
    const prompt = optText(bg.prompt, MAX_TEXT)
    if (!prompt.ok) return fail('background.prompt')
    const refPath = bg.refPath
    if (has(refPath) && !isOwnUpload(refPath, userId)) return fail('background.refPath')
    background = { prompt: prompt.value, refPath: isOwnUpload(refPath, userId) ? refPath : null }
  }

  if (!RATIOS.includes(b.ratio as Ratio)) return fail('ratio')

  if (!Array.isArray(b.frames) || b.frames.length === 0 || b.frames.length > MAX_FRAMES) return fail('frames')
  const frames: FrameSpec[] = []
  const keys = new Set<string>()
  for (let i = 0; i < b.frames.length; i++) {
    const f = b.frames[i] as Record<string, unknown> | null
    if (!f || typeof f !== 'object') return fail(`frames[${i}]`)
    if (typeof f.key !== 'string' || !KEY_RE.test(f.key) || keys.has(f.key)) return fail(`frames[${i}].key`)
    keys.add(f.key)
    const prompt = optText(f.prompt, MAX_TEXT)
    if (!prompt.ok || !prompt.value) return fail(`frames[${i}].prompt`)
    if (has(f.shotType) && !SHOT_TYPES.includes(f.shotType as ShotType)) return fail(`frames[${i}].shotType`)
    if (has(f.side) && f.side !== 'front' && f.side !== 'back') return fail(`frames[${i}].side`)
    frames.push({
      key: f.key,
      prompt: prompt.value,
      shotType: has(f.shotType) ? (f.shotType as ShotType) : null,
      side: f.side === 'back' ? 'back' : 'front',
    })
  }

  return {
    ok: true,
    title: title.value ?? '',
    setupId,
    input: {
      version: 1,
      cast: { path: castPath },
      products,
      tuck,
      background,
      ratio: b.ratio as Ratio,
      frames,
      system: SYSTEM_ID,
      quality: '2k',
    },
  }
}

// Bir kare için generate-ecom isteği. K15: poz kimliği alanında karenin kimliği gider;
// fonksiyon bunu generations.params.poses'a yazar, kare kayda kesin bağlanır.
export function buildEcomBody(p: CampaignParams, spec: FrameSpec, frameId: string, inputs: LoadedInputs) {
  return {
    model: inputs.cast,
    modelId: null,
    clothes: p.products.map((prod, i) => {
      const img = inputs.products[i]
      return {
        category: ECOM_CATEGORY[prod.category],
        front: img.front,
        ...(img.back ? { back: img.back } : {}),
        ...(img.detail ? { frontDetail: img.detail } : {}),
      }
    }),
    ...(p.tuck ? { tuck: p.tuck } : {}),
    poses: [{ id: frameId, prompt: spec.prompt, shot_type: spec.shotType }],
    side: spec.side,
    backgroundPrompt: p.background.prompt ?? '',
    ...(inputs.backgroundRef ? { backgroundRef: inputs.backgroundRef } : {}),
    ratio: p.ratio,
    quality: p.quality,
    system: p.system,
  }
}

// Motorun hata yanıtından kareye yazılacak kod.
export function errorCodeFrom(status: number, body: unknown): string {
  const e = body && typeof body === 'object' ? (body as Record<string, unknown>).error : undefined
  return typeof e === 'string' && ERROR_RE.test(e) ? e : `http_${status}`
}

export function parseDataUrl(s: unknown): { mime: string; ext: string; bytes: Uint8Array } | null {
  if (typeof s !== 'string') return null
  const m = s.match(/^data:(image\/(png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/)
  if (!m) return null
  const bin = atob(m[3])
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return { mime: m[1], ext: m[2] === 'jpeg' ? 'jpg' : m[2], bytes }
}

export function toBase64(bytes: Uint8Array): string {
  let s = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(s)
}
