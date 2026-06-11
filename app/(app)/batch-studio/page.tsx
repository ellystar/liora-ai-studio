'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, X, Plus, Trash2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import { createClient } from '@/lib/supabase/client'
import { useDropzone } from '@/lib/hooks/use-dropzone'
import { AssetPicker } from '@/components/asset-picker'
import type { Asset } from '@/lib/assets/assets'

type Model = { id: string; name: string; gender: string | null; image_url: string; scope: string }
type Background = { id: string; name: string; thumbnail_url: string; prompt: string }
type Pose = { id: string; name: string; thumbnail_url: string; prompt: string }

type GarmentSource =
  | { kind: 'file'; file: File; previewUrl: string }
  | { kind: 'asset'; url: string; assetId: string }

type BatchProduct = {
  id: string
  top: GarmentSource | null
  bottom: GarmentSource | null
  tuck: 'in' | 'out' | null
  notes: string
  modelId: string | null
  poseIds: string[]
}

const RATIOS = ['1:1', '2:3', '3:4', '4:3', '9:16'] as const
const QUALITIES = ['1k', '2k'] as const

type Ratio = (typeof RATIOS)[number]
type Quality = (typeof QUALITIES)[number]
type GarmentSlot = 'top' | 'bottom'
type PickerTarget = { productId: string; slot: GarmentSlot }

function emptyProduct(): BatchProduct {
  return {
    id: crypto.randomUUID(),
    top: null,
    bottom: null,
    tuck: null,
    notes: '',
    modelId: null,
    poseIds: [],
  }
}

function garmentPreview(source: GarmentSource | null): string | null {
  if (!source) return null
  return source.kind === 'file' ? source.previewUrl : source.url
}

function ItemCard({ selected, onClick, name, imageUrl, multi }: {
  selected: boolean
  onClick: () => void
  name: string
  imageUrl: string
  multi?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl bg-[#141414] text-left transition ${selected ? 'border-[1.5px] border-white' : 'border border-[#242424] hover:border-[#2e2e2e]'}`}
    >
      <div className="relative aspect-[3/4] bg-[#1c1c1c]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        {selected && (
          <span className={`absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center bg-white ${multi ? 'rounded' : 'rounded-full'}`}>
            <Check className="h-3 w-3 text-[#0a0a0a]" />
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs text-neutral-200">{name}</p>
      </div>
    </button>
  )
}

function GarmentUpload({
  label,
  source,
  onPickFile,
  onPickAsset,
  onClear,
  onDropFile,
}: {
  label: string
  source: GarmentSource | null
  onPickFile: () => void
  onPickAsset: () => void
  onClear: () => void
  onDropFile: (file: File) => void
}) {
  const { t } = useI18n()
  const { isDragging, dropHandlers } = useDropzone((files) => {
    if (files[0]) onDropFile(files[0])
  })
  const preview = garmentPreview(source)

  return (
    <div className="flex-1">
      <p className="mb-1.5 text-xs text-neutral-400">{label}</p>
      {preview ? (
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl border border-[#242424] bg-[#141414]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            aria-label="Kaldir"
            className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70"
          >
            <X className="h-3 w-3 text-white" />
          </button>
        </div>
      ) : (
        <div
          {...dropHandlers}
          className={`flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#333] p-2 text-neutral-500 transition${isDragging ? ' border-white bg-[#161616]' : ''}`}
        >
          <div className="flex w-full flex-col gap-1">
            <button
              type="button"
              onClick={onPickFile}
              className="rounded-lg border border-[#2a2a2a] px-2 py-1 text-[10px] text-neutral-300 transition hover:bg-[#1c1c1c]"
            >
              {t('assets.fromComputer')}
            </button>
            <button
              type="button"
              onClick={onPickAsset}
              className="rounded-lg border border-[#2a2a2a] px-2 py-1 text-[10px] text-neutral-300 transition hover:bg-[#1c1c1c]"
            >
              {t('assets.fromAssets')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BatchStudioPage() {
  const { t, locale } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileTarget, setFileTarget] = useState<PickerTarget | null>(null)
  const [assetPickerTarget, setAssetPickerTarget] = useState<PickerTarget | null>(null)

  const [models, setModels] = useState<Model[]>([])
  const [backgrounds, setBackgrounds] = useState<Background[]>([])
  const [poses, setPoses] = useState<Pose[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [products, setProducts] = useState<BatchProduct[]>([])
  const [commonModelId, setCommonModelId] = useState<string | null>(null)
  const [commonPoseIds, setCommonPoseIds] = useState<string[]>([])
  const [backgroundId, setBackgroundId] = useState<string | null>(null)
  const [ratio, setRatio] = useState<Ratio>('2:3')
  const [quality, setQuality] = useState<Quality>('2k')

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const [m, b, p] = await Promise.all([
        supabase.from('models').select('id,name,gender,image_url,scope').order('created_at', { ascending: false }),
        supabase.from('backgrounds').select('id,name,thumbnail_url,prompt').order('created_at', { ascending: false }),
        supabase.from('poses').select('id,name,thumbnail_url,prompt').order('created_at', { ascending: false }),
      ])
      setModels((m.data as Model[]) ?? [])
      setBackgrounds((b.data as Background[]) ?? [])
      setPoses((p.data as Pose[]) ?? [])
      setLoadingData(false)
    })()
  }, [])

  function setGarment(productId: string, slot: GarmentSlot, source: GarmentSource | null) {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, [slot]: source } : p))
    )
  }

  function handleFileInput(files: FileList | null) {
    if (!files?.[0] || !fileTarget) return
    const file = files[0]
    setGarment(fileTarget.productId, fileTarget.slot, {
      kind: 'file',
      file,
      previewUrl: URL.createObjectURL(file),
    })
    setFileTarget(null)
  }

  function handleAssetSelect(asset: Asset) {
    if (!assetPickerTarget || !asset.signedUrl) return
    setGarment(assetPickerTarget.productId, assetPickerTarget.slot, {
      kind: 'asset',
      url: asset.signedUrl,
      assetId: asset.id,
    })
    setAssetPickerTarget(null)
  }

  function updateProduct(id: string, patch: Partial<BatchProduct>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function toggleProductPose(productId: string, poseId: string) {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p
        const poseIds = p.poseIds.includes(poseId)
          ? p.poseIds.filter((id) => id !== poseId)
          : [...p.poseIds, poseId]
        return { ...p, poseIds }
      })
    )
  }

  function toggleCommonPose(poseId: string) {
    setCommonPoseIds((prev) =>
      prev.includes(poseId) ? prev.filter((id) => id !== poseId) : [...prev, poseId]
    )
  }

  const totalJobs = products.reduce((sum, p) => {
    const poseCount = p.poseIds.length > 0 ? p.poseIds.length : commonPoseIds.length
    return sum + poseCount
  }, 0)

  const canStart =
    products.length > 0 &&
    products.every((p) => p.top || p.bottom) &&
    products.every((p) => p.modelId || commonModelId) &&
    products.every((p) => p.poseIds.length > 0 || commonPoseIds.length > 0) &&
    backgroundId !== null

  async function handleStartBatch() {
    console.log('batch start', { products, commonModelId, commonPoseIds, backgroundId, ratio, quality })
  }

  const summaryText = t('batch.summary').replace(/\{count\}/g, String(totalJobs))

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <p className="mb-6 text-xs text-neutral-500">{t('batch.title')}</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { handleFileInput(e.target.files); e.target.value = '' }}
      />

      {/* Products */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-100">
          {locale === 'tr' ? 'Ürünler' : 'Products'}
        </h2>
        <div className="space-y-4">
          {products.map((product, index) => (
            <div key={product.id} className="rounded-2xl border border-[#242424] bg-[#141414] p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-100">
                  {t('batch.product')} {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => setProducts((prev) => prev.filter((p) => p.id !== product.id))}
                  className="flex items-center gap-1 text-xs text-neutral-500 transition hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex gap-3">
                <GarmentUpload
                  label={t('batch.topPhoto')}
                  source={product.top}
                  onPickFile={() => { setFileTarget({ productId: product.id, slot: 'top' }); fileInputRef.current?.click() }}
                  onPickAsset={() => setAssetPickerTarget({ productId: product.id, slot: 'top' })}
                  onClear={() => setGarment(product.id, 'top', null)}
                  onDropFile={(file) => setGarment(product.id, 'top', { kind: 'file', file, previewUrl: URL.createObjectURL(file) })}
                />
                <GarmentUpload
                  label={t('batch.bottomPhoto')}
                  source={product.bottom}
                  onPickFile={() => { setFileTarget({ productId: product.id, slot: 'bottom' }); fileInputRef.current?.click() }}
                  onPickAsset={() => setAssetPickerTarget({ productId: product.id, slot: 'bottom' })}
                  onClear={() => setGarment(product.id, 'bottom', null)}
                  onDropFile={(file) => setGarment(product.id, 'bottom', { kind: 'file', file, previewUrl: URL.createObjectURL(file) })}
                />
              </div>

              <div className="mt-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateProduct(product.id, { tuck: product.tuck === 'out' ? null : 'out' })}
                    className={`rounded-lg border px-4 py-2 text-sm transition ${product.tuck === 'out' ? 'border-white text-neutral-100' : 'border-[#2a2a2a] text-neutral-400 hover:text-neutral-200'}`}
                  >
                    {t('ecom.tuck.out')}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateProduct(product.id, { tuck: product.tuck === 'in' ? null : 'in' })}
                    className={`rounded-lg border px-4 py-2 text-sm transition ${product.tuck === 'in' ? 'border-white text-neutral-100' : 'border-[#2a2a2a] text-neutral-400 hover:text-neutral-200'}`}
                  >
                    {t('ecom.tuck.in')}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-[10px] text-neutral-500">{t('ecom.stylingNotes.label')}</label>
                <textarea
                  value={product.notes}
                  onChange={(e) => updateProduct(product.id, { notes: e.target.value })}
                  placeholder={t('ecom.stylingNotes.placeholder')}
                  rows={2}
                  className="min-h-[60px] w-full rounded-lg border border-[#242424] bg-[#141414] p-2 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-[#3a3a3a]"
                />
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs text-neutral-400">{t('batch.perProductModel')}</p>
                  {product.modelId && (
                    <button
                      type="button"
                      onClick={() => updateProduct(product.id, { modelId: null })}
                      className="text-[10px] text-neutral-500 hover:text-neutral-300"
                    >
                      {locale === 'tr' ? 'Temizle' : 'Clear'}
                    </button>
                  )}
                </div>
                {loadingData ? (
                  <p className="text-xs text-neutral-500">{t('ecom.loading')}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {models.map((m) => (
                      <ItemCard
                        key={m.id}
                        selected={product.modelId === m.id}
                        onClick={() => updateProduct(product.id, { modelId: m.id })}
                        name={m.name}
                        imageUrl={m.image_url}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <p className="mb-2 text-xs text-neutral-400">{t('batch.perProductPoses')}</p>
                {loadingData ? (
                  <p className="text-xs text-neutral-500">{t('ecom.loading')}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {poses.map((p) => (
                      <ItemCard
                        key={p.id}
                        selected={product.poseIds.includes(p.id)}
                        onClick={() => toggleProductPose(product.id, p.id)}
                        name={p.name}
                        imageUrl={p.thumbnail_url}
                        multi
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setProducts((prev) => [...prev, emptyProduct()])}
            disabled={products.length >= 50}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-neutral-300 transition hover:bg-[#161616] disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            {t('batch.addProduct')}
          </button>
          {products.length >= 50 && (
            <p className="mt-2 text-[11px] text-neutral-600">{t('batch.maxProducts')}</p>
          )}
        </div>
      </section>

      {/* Common settings */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-neutral-100">
          {locale === 'tr' ? 'Ortak ayarlar' : 'Shared settings'}
        </h2>

        <div className="space-y-6 rounded-2xl border border-[#242424] bg-[#141414] p-4">
          <div>
            <p className="mb-2 text-xs text-neutral-400">{t('batch.commonModel')}</p>
            {loadingData ? (
              <p className="text-xs text-neutral-500">{t('ecom.loading')}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {models.map((m) => (
                  <ItemCard
                    key={m.id}
                    selected={commonModelId === m.id}
                    onClick={() => setCommonModelId(m.id)}
                    name={m.name}
                    imageUrl={m.image_url}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs text-neutral-400">{t('batch.commonPoses')}</p>
            {loadingData ? (
              <p className="text-xs text-neutral-500">{t('ecom.loading')}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {poses.map((p) => (
                  <ItemCard
                    key={p.id}
                    selected={commonPoseIds.includes(p.id)}
                    onClick={() => toggleCommonPose(p.id)}
                    name={p.name}
                    imageUrl={p.thumbnail_url}
                    multi
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs text-neutral-400">{t('ecom.step.background')}</p>
            {loadingData ? (
              <p className="text-xs text-neutral-500">{t('ecom.loading')}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {backgrounds.map((b) => (
                  <ItemCard
                    key={b.id}
                    selected={backgroundId === b.id}
                    onClick={() => setBackgroundId(b.id)}
                    name={b.name}
                    imageUrl={b.thumbnail_url}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-xs text-neutral-400">{t('ecom.size.ratio')}</p>
            <div className="flex flex-wrap gap-2">
              {RATIOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRatio(r)}
                  className={`rounded-lg px-4 py-2 text-sm transition ${ratio === r ? 'bg-white text-[#0a0a0a]' : 'border border-[#2a2a2a] text-neutral-300 hover:bg-[#161616]'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-neutral-400">{t('ecom.size.quality')}</p>
            <div className="flex flex-wrap gap-2">
              {QUALITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuality(q)}
                  className={`rounded-lg px-4 py-2 text-sm uppercase transition ${quality === q ? 'bg-white text-[#0a0a0a]' : 'border border-[#2a2a2a] text-neutral-300 hover:bg-[#161616]'}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium text-neutral-100">
          {locale === 'tr' ? 'Özet' : 'Summary'}
        </h2>
        <div className="flex items-center justify-between rounded-2xl border border-[#242424] bg-[#141414] p-4">
          <p className="text-sm text-neutral-300">{summaryText}</p>
          <button
            type="button"
            onClick={handleStartBatch}
            disabled={!canStart}
            className="rounded-lg bg-white px-6 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-40"
          >
            {t('batch.start')}
          </button>
        </div>
      </section>

      <AssetPicker
        open={assetPickerTarget !== null}
        onClose={() => setAssetPickerTarget(null)}
        onSelect={handleAssetSelect}
      />
    </main>
  )
}
