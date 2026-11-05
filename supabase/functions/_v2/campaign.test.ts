// v2 · campaign.ts sınavı. Ağ ve veritabanı yok:
//   deno test --no-lock supabase/functions/_v2/campaign.test.ts

import {
  buildEcomBody,
  type CampaignParams,
  errorCodeFrom,
  isOwnUpload,
  type LoadedInputs,
  parseCampaignInput,
  parseDataUrl,
  toBase64,
} from './campaign.ts'

const U = 'aaaaaaaa-0000-4000-8000-000000000001'
const OTHER = 'bbbbbbbb-0000-4000-8000-000000000002'
const up = (f: string, u = U) => `${u}/v2/uploads/${f}`

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}
function fails(body: unknown, field: string) {
  const r = parseCampaignInput(body, U)
  assert(!r.ok && r.field === field, `${field} reddedilmeliydi: ${JSON.stringify(r)}`)
}

type TestBody = {
  flow: string
  title?: string
  setupId?: string
  cast: { path: string }
  products: { category: string; front: string; back?: string; detail?: string }[]
  tuck?: string
  background?: { prompt?: string; refPath?: string }
  ratio: string
  frames: { key: string; prompt: string; shotType?: string; side?: string }[]
}

const valid = (): TestBody => ({
  flow: 'campaign',
  title: ' Kaban ',
  cast: { path: up('cast.jpg') },
  products: [
    { category: 'top', front: up('top-front.png'), detail: up('top-logo.png') },
    { category: 'bottom', front: up('bottom.webp'), back: up('bottom-back.jpeg') },
  ],
  tuck: 'in',
  background: { prompt: 'alçı stüdyo, yumuşak ışık' },
  ratio: '4:5',
  frames: [{ key: 'pose-01', prompt: 'standing, hands in pockets', shotType: 'full_body' }],
})

Deno.test('geçerli istek anlık görüntüye çevrilir', () => {
  const r = parseCampaignInput(valid(), U)
  assert(r.ok, JSON.stringify(r))
  assert(r.title === 'Kaban', 'başlık kırpılır')
  assert(r.setupId === null, 'kurulum yok')
  assert(r.input.quality === '2k', 'kalite küçük harf 2k (Kural 7)')
  assert(r.input.system === 'ghost_to_campaign', 'sistem açıkça')
  assert(r.input.tuck === 'in', 'üst ve alt varken tuck kalır')
  assert(r.input.frames[0].side === 'front' && r.input.frames[0].shotType === 'full_body', 'kare varsayılanları')
  assert(r.input.background.refPath === null, 'referans yok')
})

Deno.test('dosya yolu yalnızca çağıranın v2/uploads klasöründe', () => {
  assert(isOwnUpload(up('a.png'), U), 'kendi dosyası')
  assert(!isOwnUpload(up('a.png', OTHER), U), 'başkasının dosyası')
  assert(!isOwnUpload(`${U}/v2/uploads/../../${OTHER}/v2/uploads/a.png`, U), 'klasör dışına çıkan yol')
  assert(!isOwnUpload(`${U}/v2/uploads/sub/a.png`, U), 'alt klasör')
  assert(!isOwnUpload(`${U}/a.png`, U), 'v2 dışı')
  assert(!isOwnUpload(up('a.gif'), U), 'desteklenmeyen tür')
  assert(!isOwnUpload(up('.png'), U), 'adsız dosya')
  const b = valid()
  b.cast.path = up('cast.jpg', OTHER)
  fails(b, 'cast')
  const c = valid()
  c.products[1].back = up('x.png', OTHER)
  fails(c, 'products[1].back')
  const d = valid()
  d.background = { refPath: up('bg.png', OTHER) }
  fails(d, 'background.refPath')
})

Deno.test('ilk sürüm tek kare, en fazla 4 ürün', () => {
  const b = valid()
  b.frames.push({ key: 'pose-02', prompt: 'walking', shotType: 'medium_shot' })
  fails(b, 'frames')
  const c = valid()
  c.frames = []
  fails(c, 'frames')
  const d = valid()
  d.products = Array.from({ length: 5 }, (_, i) => ({ category: 'acc', front: up(`p${i}.png`) }))
  fails(d, 'products')
})

Deno.test('geçersiz alanlar reddedilir', () => {
  fails({ ...valid(), flow: 'ghost' }, 'flow')
  fails({ ...valid(), ratio: '16:9' }, 'ratio')
  fails({ ...valid(), tuck: 'half' }, 'tuck')
  fails({ ...valid(), setupId: 'not-a-uuid' }, 'setupId')
  fails({ ...valid(), title: 'x'.repeat(121) }, 'title')
  const b = valid()
  b.products[0].category = 'hat'
  fails(b, 'products[0].category')
  const c = valid()
  c.frames[0].prompt = '   '
  fails(c, 'frames[0].prompt')
  const d = valid()
  d.frames[0].shotType = 'wide'
  fails(d, 'frames[0].shotType')
  const e = valid()
  e.frames[0].key = 'a b'
  fails(e, 'frames[0].key')
  fails(null, 'body')
  fails([], 'body')
})

Deno.test('tuck yalnızca üst ve alt birlikteyken gider', () => {
  const b = valid()
  b.products = [{ category: 'outer', front: up('coat.png') }]
  const r = parseCampaignInput(b, U)
  assert(r.ok && r.input.tuck === null, JSON.stringify(r))
})

Deno.test('generate-ecom isteği sözleşmeye göre kurulur', () => {
  const r = parseCampaignInput({ ...valid(), frames: [{ key: 'pose-01', prompt: 'from behind', side: 'back' }] }, U)
  assert(r.ok, JSON.stringify(r))
  const p: CampaignParams = { ...r.input, price: 1 }
  const img = (n: string) => ({ base64: n, mimeType: 'image/png' })
  const inputs: LoadedInputs = {
    cast: img('cast'),
    products: [{ front: img('top'), detail: img('logo') }, { front: img('bottom'), back: img('bottom-back') }],
  }
  const frameId = 'cccccccc-0000-4000-8000-000000000003'
  const body = buildEcomBody(p, p.frames[0], frameId, inputs)
  assert(body.poses.length === 1 && body.poses[0].id === frameId, 'poz kimliği alanında karenin kimliği (K15)')
  assert(body.poses[0].shot_type === null, 'kadraj yoksa null')
  assert(body.side === 'back', 'arka kare')
  assert(body.quality === '2k', 'kalite küçük harf 2k')
  assert(body.system === 'ghost_to_campaign', 'sistem')
  assert(body.ratio === '4:5', 'oran')
  assert(body.modelId === null, 'katalog kimliği yok')
  assert(body.tuck === 'in', 'tuck')
  assert(body.backgroundPrompt === 'alçı stüdyo, yumuşak ışık' && !('backgroundRef' in body), 'ortam metni')
  const [top, bottom] = body.clothes as Record<string, unknown>[]
  assert(top.category === 'top' && 'frontDetail' in top && !('back' in top), 'detay frontDetail olur')
  assert(bottom.category === 'bottom' && 'back' in bottom && !('frontDetail' in bottom), 'arka görünüş')
  const outer = buildEcomBody({ ...p, products: [{ category: 'outer', front: up('c.png') }] }, p.frames[0], frameId, {
    cast: img('cast'),
    products: [{ front: img('coat') }],
  })
  assert((outer.clothes[0] as Record<string, unknown>).category === 'outerwear', 'outer -> outerwear')
})

Deno.test('hata kodu ve görsel yardımcıları', () => {
  assert(errorCodeFrom(503, { error: 'model_busy' }) === 'model_busy', 'bilinen kod')
  assert(errorCodeFrom(422, { error: 'no_image' }) === 'no_image', 'no_image')
  assert(errorCodeFrom(500, { error: 'Bad Thing!' }) === 'http_500', 'biçimsiz kod')
  assert(errorCodeFrom(502, null) === 'http_502', 'gövdesiz')
  const bytes = new Uint8Array([137, 80, 78, 71, 0, 255, 10])
  const parsed = parseDataUrl(`data:image/png;base64,${toBase64(bytes)}`)
  assert(parsed && parsed.ext === 'png' && parsed.mime === 'image/png', 'png')
  assert(parsed && parsed.bytes.length === bytes.length && parsed.bytes.every((b, i) => b === bytes[i]), 'baytlar aynı')
  assert(parseDataUrl('data:image/jpeg;base64,AAAA')?.ext === 'jpg', 'jpeg -> jpg')
  assert(parseDataUrl('data:text/html;base64,AAAA') === null, 'görsel değil')
  assert(parseDataUrl('https://x/y.png') === null, 'adres değil')
  const big = new Uint8Array(100_000).map((_, i) => i % 256)
  assert(atob(toBase64(big)).length === big.length, 'büyük dosya parça parça kodlanır')
})
