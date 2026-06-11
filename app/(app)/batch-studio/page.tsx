'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, Trash2, X } from 'lucide-react'
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
  showDetail: boolean
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
    showDetail: false,
  }
}

function fileSource(file: File): GarmentSource {
  return { kind: 'file', file, previewUrl: URL.createObjectURL(file) }
}

function garmentPreview(source: GarmentSource | null): string | null {
  if (!source) return null
  return source.kind === 'file' ? source.previewUrl : source.url
}

function hasCustomDetail(p: BatchProduct): boolean {
  return p.tuck !== null || p.notes.trim() !== '' || p.modelId !== null || p.poseIds.length > 0
}

function GarmentMiniSlot({
  label,
  source,
  menuOpen,
  onToggleMenu,
  onPickFile,
  onPickAsset,
  onClear,
  onDropFile,
}: {
  label: string
  source: GarmentSource | null
  menuOpen: boolean
  onToggleMenu: () => void
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

  if (preview) {
    return (
      <div className="relative aspect-square flex-1 overflow-hidden rounded-lg border border-[#242424] bg-[#1c1c1c]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={onClear}
          aria-label="Kaldir"
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70"
        >
          <X className="h-3 w-3 text-white" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative flex-1">
      <button
        type="button"
        {...dropHandlers}
        onClick={onToggleMenu}
        className={`flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#333] bg-[#141414] text-neutral-500 transition hover:border-[#444] hover:text-neutral-400${isDragging ? ' border-white bg-[#161616]' : ''}`}
      >
        <Plus className="h-4 w-4" />
        <span className="text-[10px]">{label}</span>
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onToggleMenu} />
          <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-lg border border-[#242424] bg-[#1c1c1c] shadow-lg">
            <button
              type="button"
              onClick={() => { onPickFile(); onToggleMenu() }}
              className="block w-full px-2 py-1.5 text-left text-[10px] text-neutral-300 hover:bg-[#242424]"
            >
              {t('assets.fromComputer')}
            </button>
            <button
              type="button"
              onClick={() => { onPickAsset(); onToggleMenu() }}
              className="block w-full px-2 py-1.5 text-left text-[10px] text-neutral-300 hover:bg-[#242424]"
            >
              {t('assets.fromAssets')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ProductCard({
  product,
  models,
  poses,
  slotMenu,
  onSlotMenu,
  onPickFile,
  onPickAsset,
  onClearSlot,
  onDropSlot,
  onUpdate,
  onTogglePose,
  onRemove,
  topLabel,
  bottomLabel,
}: {
  product: BatchProduct
  models: Model[]
  poses: Pose[]
  slotMenu: PickerTarget | null
  onSlotMenu: (target: PickerTarget | null) => void
  onPickFile: (target: PickerTarget) => void
  onPickAsset: (target: PickerTarget) => void
  onClearSlot: (productId: string, slot: GarmentSlot) => void
  onDropSlot: (productId: string, slot: GarmentSlot, file: File) => void
  onUpdate: (id: string, patch: Partial<BatchProduct>) => void
  onTogglePose: (productId: string, poseId: string) => void
  onRemove: (id: string) => void
  topLabel: string
  bottomLabel: string
}) {
  const { t } = useI18n()
  const custom = hasCustomDetail(product)

  return (
    <div className="rounded-xl border border-[#242424] bg-[#141414] p-2.5">
      <div className="flex gap-2">
        <GarmentMiniSlot
          label={topLabel}
          source={product.top}
          menuOpen={slotMenu?.productId === product.id && slotMenu.slot === 'top'}
          onToggleMenu={() => onSlotMenu(
            slotMenu?.productId === product.id && slotMenu.slot === 'top'
              ? null
              : { productId: product.id, slot: 'top' }
          )}
          onPickFile={() => onPickFile({ productId: product.id, slot: 'top' })}
          onPickAsset={() => onPickAsset({ productId: product.id, slot: 'top' })}
          onClear={() => onClearSlot(product.id, 'top')}
          onDropFile={(file) => onDropSlot(product.id, 'top', file)}
        />
        <GarmentMiniSlot
          label={bottomLabel}
          source={product.bottom}
          menuOpen={slotMenu?.productId === product.id && slotMenu.slot === 'bottom'}
          onToggleMenu={() => onSlotMenu(
            slotMenu?.productId === product.id && slotMenu.slot === 'bottom'
              ? null
              : { productId: product.id, slot: 'bottom' }
          )}
          onPickFile={() => onPickFile({ productId: product.id, slot: 'bottom' })}
          onPickAsset={() => onPickAsset({ productId: product.id, slot: 'bottom' })}
          onClear={() => onClearSlot(product.id, 'bottom')}
          onDropFile={(file) => onDropSlot(product.id, 'bottom', file)}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onUpdate(product.id, { showDetail: !product.showDetail })}
          className={`text-[11px] transition ${custom ? 'text-sky-400' : 'text-neutral-500 hover:text-neutral-300'}`}
        >
          {custom ? t('batch.detailCustom') : t('batch.detail')}
        </button>
        <button
          type="button"
          onClick={() => onRemove(product.id)}
          className="text-neutral-600 transition hover:text-red-400"
          aria-label="Sil"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {product.showDetail && (
        <div className="mt-2 space-y-2 border-t border-[#242424] pt-2">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onUpdate(product.id, { tuck: product.tuck === 'out' ? null : 'out' })}
              className={`rounded border px-2 py-0.5 text-[10px] transition ${product.tuck === 'out' ? 'border-white text-neutral-100' : 'border-[#2a2a2a] text-neutral-500'}`}
            >
              {t('ecom.tuck.out')}
            </button>
            <button
              type="button"
              onClick={() => onUpdate(product.id, { tuck: product.tuck === 'in' ? null : 'in' })}
              className={`rounded border px-2 py-0.5 text-[10px] transition ${product.tuck === 'in' ? 'border-white text-neutral-100' : 'border-[#2a2a2a] text-neutral-500'}`}
            >
              {t('ecom.tuck.in')}
            </button>
          </div>
          <textarea
            value={product.notes}
            onChange={(e) => onUpdate(product.id, { notes: e.target.value })}
            placeholder={t('ecom.stylingNotes.placeholder')}
            rows={2}
            className="min-h-[48px] w-full rounded-lg border border-[#242424] bg-[#141414] p-1.5 text-[10px] text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-[#3a3a3a]"
          />
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[10px] text-neutral-500">{t('batch.perProductModel')}</p>
              {product.modelId && (
                <button type="button" onClick={() => onUpdate(product.id, { modelId: null })} className="text-[9px] text-neutral-600 hover:text-neutral-400">
                  ×
                </button>
              )}
            </div>
            <select
              value={product.modelId ?? ''}
              onChange={(e) => onUpdate(product.id, { modelId: e.target.value || null })}
              className="w-full rounded-lg border border-[#242424] bg-[#141414] px-2 py-1 text-[10px] text-neutral-200 outline-none"
            >
              <option value="">{t('batch.commonModel')}</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-[10px] text-neutral-500">{t('batch.perProductPoses')}</p>
            <div className="flex flex-wrap gap-1">
              {poses.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onTogglePose(product.id, p.id)}
                  className={`rounded-full border px-2 py-0.5 text-[9px] transition ${product.poseIds.includes(p.id) ? 'border-white bg-white text-[#0a0a0a]' : 'border-[#2a2a2a] text-neutral-500'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddProductTile({
  disabled,
  onAddEmpty,
  onAddFiles,
}: {
  disabled: boolean
  onAddEmpty: () => void
  onAddFiles: (files: FileList) => void
}) {
  const { t } = useI18n()
  const { isDragging, dropHandlers } = useDropzone((files) => {
    if (!disabled && files.length > 0) onAddFiles(files)
  })

  return (
    <button
      type="button"
      disabled={disabled}
      {...dropHandlers}
      onClick={() => { if (!disabled) onAddEmpty() }}
      className={`flex min-h-[120px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#333] p-3 text-neutral-500 transition disabled:opacity-40${isDragging ? ' border-white bg-[#161616]' : ' hover:border-[#444] hover:text-neutral-400'}`}
    >
      <Plus className="h-5 w-5" />
      <span className="text-center text-[11px] leading-tight">{t('batch.addProduct')}</span>
    </button>
  )
}

export default function BatchStudioPage() {
  const { t, locale } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileTarget, setFileTarget] = useState<PickerTarget | null>(null)
  const [assetPickerTarget, setAssetPickerTarget] = useState<PickerTarget | null>(null)
  const [slotMenu, setSlotMenu] = useState<PickerTarget | null>(null)
  const [modelPickerOpen, setModelPickerOpen] = useState(false)
  const [bgPickerOpen, setBgPickerOpen] = useState(false)

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

  const topLabel = locale === 'tr' ? 'Üst' : 'Top'
  const bottomLabel = locale === 'tr' ? 'Alt' : 'Bottom'
  const commonModel = models.find((m) => m.id === commonModelId)
  const commonBackground = backgrounds.find((b) => b.id === backgroundId)

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
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, [slot]: source } : p)))
  }

  function handleFileInput(files: FileList | null) {
    if (!files?.[0] || !fileTarget) return
    setGarment(fileTarget.productId, fileTarget.slot, fileSource(files[0]))
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

  function addEmptyProduct() {
    if (products.length >= 50) return
    setProducts((prev) => [...prev, emptyProduct()])
  }

  function addProductsFromFiles(files: FileList) {
    const remaining = 50 - products.length
    if (remaining <= 0) return
    const toAdd = Array.from(files).slice(0, remaining).map((file) => ({
      ...emptyProduct(),
      top: fileSource(file),
    }))
    setProducts((prev) => [...prev, ...toAdd])
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
  const atMax = products.length >= 50

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <p className="mb-5 text-xs text-neutral-500">{t('batch.title')}</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { handleFileInput(e.target.files); e.target.value = '' }}
      />

      <div className="flex flex-col items-start gap-4 lg:flex-row">
        {/* Left — Products */}
        <div className="min-w-0 flex-[1.7]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-100">
              {locale === 'tr' ? 'Ürünler' : 'Products'}
            </h2>
            <span className="text-xs text-neutral-500">{products.length} / 50</span>
          </div>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                models={models}
                poses={poses}
                slotMenu={slotMenu}
                onSlotMenu={setSlotMenu}
                onPickFile={(target) => { setFileTarget(target); fileInputRef.current?.click() }}
                onPickAsset={setAssetPickerTarget}
                onClearSlot={(id, slot) => setGarment(id, slot, null)}
                onDropSlot={(id, slot, file) => setGarment(id, slot, fileSource(file))}
                onUpdate={updateProduct}
                onTogglePose={toggleProductPose}
                onRemove={(id) => setProducts((prev) => prev.filter((p) => p.id !== id))}
                topLabel={topLabel}
                bottomLabel={bottomLabel}
              />
            ))}
            <AddProductTile
              disabled={atMax}
              onAddEmpty={addEmptyProduct}
              onAddFiles={addProductsFromFiles}
            />
          </div>

          {atMax && (
            <p className="mt-2 text-[11px] text-neutral-600">{t('batch.maxProducts')}</p>
          )}
        </div>

        {/* Right — Common settings (sticky) */}
        <div className="w-full shrink-0 lg:sticky lg:top-20 lg:flex-1">
          <div className="rounded-2xl border border-[#242424] bg-[#141414] p-4">
            <h2 className="mb-4 text-sm font-medium text-neutral-100">
              {locale === 'tr' ? 'Ortak ayarlar' : 'Shared settings'}
            </h2>

            <div className="space-y-4">
              {/* Common model */}
              <div>
                <p className="mb-1.5 text-xs text-neutral-500">{t('batch.commonModel')}</p>
                {loadingData ? (
                  <p className="text-xs text-neutral-600">{t('ecom.loading')}</p>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setModelPickerOpen((v) => !v)}
                      className="flex w-full items-center gap-2 rounded-lg border border-[#242424] bg-[#141414] px-2 py-2 text-left transition hover:border-[#333]"
                    >
                      {commonModel ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={commonModel.image_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                          <span className="flex-1 truncate text-xs text-neutral-200">{commonModel.name}</span>
                        </>
                      ) : (
                        <span className="flex-1 text-xs text-neutral-500">{locale === 'tr' ? 'Manken seç' : 'Select model'}</span>
                      )}
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                    </button>
                    {modelPickerOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setModelPickerOpen(false)} />
                        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#242424] bg-[#1c1c1c] shadow-lg">
                          {models.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => { setCommonModelId(m.id); setModelPickerOpen(false) }}
                              className={`flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-[#242424] ${commonModelId === m.id ? 'bg-[#242424]' : ''}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={m.image_url} alt="" className="h-7 w-7 rounded object-cover" />
                              <span className="truncate text-xs text-neutral-200">{m.name}</span>
                              {commonModelId === m.id && <Check className="ml-auto h-3 w-3 text-white" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Common poses */}
              <div>
                <p className="mb-1.5 text-xs text-neutral-500">{t('batch.commonPoses')}</p>
                {loadingData ? (
                  <p className="text-xs text-neutral-600">{t('ecom.loading')}</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {poses.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleCommonPose(p.id)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition ${commonPoseIds.includes(p.id) ? 'border-white bg-white text-[#0a0a0a]' : 'border-[#2a2a2a] text-neutral-400 hover:text-neutral-200'}`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Background */}
              <div>
                <p className="mb-1.5 text-xs text-neutral-500">{t('ecom.step.background')}</p>
                {loadingData ? (
                  <p className="text-xs text-neutral-600">{t('ecom.loading')}</p>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setBgPickerOpen((v) => !v)}
                      className="flex w-full items-center gap-2 rounded-lg border border-[#242424] bg-[#141414] px-2 py-2 text-left transition hover:border-[#333]"
                    >
                      {commonBackground ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={commonBackground.thumbnail_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                          <span className="flex-1 truncate text-xs text-neutral-200">{commonBackground.name}</span>
                        </>
                      ) : (
                        <span className="flex-1 text-xs text-neutral-500">{locale === 'tr' ? 'Arkaplan seç' : 'Select background'}</span>
                      )}
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
                    </button>
                    {bgPickerOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setBgPickerOpen(false)} />
                        <div className="absolute left-0 right-0 top-full z-20 max-h-48 overflow-y-auto rounded-lg border border-[#242424] bg-[#1c1c1c] shadow-lg">
                          {backgrounds.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => { setBackgroundId(b.id); setBgPickerOpen(false) }}
                              className={`flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-[#242424] ${backgroundId === b.id ? 'bg-[#242424]' : ''}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={b.thumbnail_url} alt="" className="h-7 w-7 rounded object-cover" />
                              <span className="truncate text-xs text-neutral-200">{b.name}</span>
                              {backgroundId === b.id && <Check className="ml-auto h-3 w-3 text-white" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Ratio & quality */}
              <div>
                <p className="mb-1.5 text-xs text-neutral-500">{t('ecom.size.ratio')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {RATIOS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRatio(r)}
                      className={`rounded-lg px-3 py-1.5 text-xs transition ${ratio === r ? 'bg-white text-[#0a0a0a]' : 'border border-[#2a2a2a] text-neutral-400 hover:text-neutral-200'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs text-neutral-500">{t('ecom.size.quality')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUALITIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuality(q)}
                      className={`rounded-lg px-3 py-1.5 text-xs uppercase transition ${quality === q ? 'bg-white text-[#0a0a0a]' : 'border border-[#2a2a2a] text-neutral-400 hover:text-neutral-200'}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary + Start */}
              <div className="rounded-xl border border-[#242424] bg-[#0a0a0a] p-3">
                <p className="text-sm text-neutral-300">{summaryText}</p>
                <button
                  type="button"
                  onClick={handleStartBatch}
                  disabled={!canStart}
                  className="mt-3 w-full rounded-lg bg-white py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-40"
                >
                  {t('batch.start')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AssetPicker
        open={assetPickerTarget !== null}
        onClose={() => setAssetPickerTarget(null)}
        onSelect={handleAssetSelect}
      />
    </main>
  )
}
