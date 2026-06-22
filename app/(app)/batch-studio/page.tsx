'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import JSZip from 'jszip'
import { AlertCircle, Check, ChevronLeft, ChevronRight, Download, Loader2, Plus, Star, Trash2, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import type { TranslationKey } from '@/lib/i18n/dictionaries'
import { createClient } from '@/lib/supabase/client'
import { useDropzone } from '@/lib/hooks/use-dropzone'
import { AssetPicker } from '@/components/asset-picker'
import type { Asset } from '@/lib/assets/assets'
import { fileToScaledBase64, urlToScaledBase64 } from '@/lib/image/scale'
import { downloadAsJpg, imageToJpegBlob } from '@/lib/image/download'
import { filterPoses, listFavoritePoseIds, toggleFavoritePose, type PoseFilter } from '@/lib/poses/favorites'
import { filterModels, listFavoriteModelIds, toggleFavoriteModel, type ModelFilter } from '@/lib/models/favorites'

type Model = { id: string; name: string; gender: string | null; image_url: string; scope: string }
type Background = { id: string; name: string; thumbnail_url: string; prompt: string }
type Pose = { id: string; name: string; thumbnail_url: string; prompt: string; shot_type?: string | null }

type GarmentSource =
  | { kind: 'file'; file: File; previewUrl: string }
  | { kind: 'asset'; url: string; assetId: string }

type GarmentCategory = 'top' | 'bottom' | 'shoes' | 'dress' | 'accessory'

type Garment = {
  id: string
  category: GarmentCategory
  source: GarmentSource
}

type BatchProduct = {
  id: string
  garments: Garment[]
  poseIds: string[]
  tuck: 'in' | 'out' | null
  notes: string
  showDetail: boolean
  modelId: string | null
}

type JobStatus = 'pending' | 'running' | 'done' | 'failed'
type Job = {
  id: string
  productId: string
  productIndex: number
  poseId: string
  poseName: string
  status: JobStatus
  image?: string
  errorCode?: string
}

const RATIOS = ['1:1', '2:3', '3:4', '4:3', '9:16'] as const
const QUALITIES = ['1k', '2k'] as const
const CATEGORIES: GarmentCategory[] = ['top', 'bottom', 'shoes', 'dress', 'accessory']
const PER_PAGE = 4
const POSE_FILTERS: PoseFilter[] = ['all', 'full_body', 'medium_shot', 'close_up', 'favorites']
const POSE_FILTER_KEYS: Record<PoseFilter, TranslationKey> = {
  all: 'poses.filter.all',
  full_body: 'poses.filter.full_body',
  medium_shot: 'poses.filter.medium_shot',
  close_up: 'poses.filter.close_up',
  favorites: 'poses.filter.favorites',
}
const MODEL_FILTERS: ModelFilter[] = ['all', 'general', 'own', 'female', 'male', 'favorites']
const MODEL_FILTER_KEYS: Record<ModelFilter, TranslationKey> = {
  all: 'models.filter.all',
  general: 'models.filter.general',
  own: 'models.filter.own',
  female: 'models.filter.female',
  male: 'models.filter.male',
  favorites: 'models.filter.favorites',
}

type Ratio = (typeof RATIOS)[number]
type Quality = (typeof QUALITIES)[number]

type PreparedProduct = {
  model: { base64: string; mimeType: string }
  clothes: { base64: string; mimeType: string; category: GarmentCategory; notes?: string }[]
  backgroundPrompt: string
  ratio: Ratio
  quality: Quality
  tuck: 'in' | 'out' | undefined
}
type GarmentFlow = {
  productId: string
  step: 'category' | 'source'
  category?: GarmentCategory
  pendingFile?: File
}
type AssetTarget = { productId: string; category: GarmentCategory }

function emptyProduct(): BatchProduct {
  return {
    id: crypto.randomUUID(),
    garments: [],
    poseIds: [],
    tuck: null,
    notes: '',
    showDetail: false,
    modelId: null,
  }
}

function fileSource(file: File): GarmentSource {
  return { kind: 'file', file, previewUrl: URL.createObjectURL(file) }
}

function garmentPreview(source: GarmentSource): string {
  return source.kind === 'file' ? source.previewUrl : source.url
}

function firstGarmentPreview(product: BatchProduct): string | null {
  return product.garments[0] ? garmentPreview(product.garments[0].source) : null
}

function hasDetailCustom(p: BatchProduct): boolean {
  return p.tuck !== null || p.notes.trim() !== ''
}

function jobErrorKey(code?: string): TranslationKey {
  if (code === 'content_blocked') return 'batch.error.blocked'
  if (code === 'model_busy') return 'batch.error.busy'
  if (code === 'insufficient_credits') return 'batch.error.insufficient'
  return 'batch.error.generic'
}

function productLabel(t: (k: TranslationKey) => string, job: Job): string {
  return t('batch.productLabel')
    .replace('{index}', String(job.productIndex + 1))
    .replace('{pose}', job.poseName)
}

function StageIndicator({ stage }: { stage: 1 | 2 | 3 }) {
  const { t } = useI18n()
  const steps = [
    { n: 1 as const, label: t('batch.stageProducts') },
    { n: 2 as const, label: t('batch.stageModels') },
    { n: 3 as const, label: t('batch.stageBg') },
  ]
  return (
    <div className="mb-6 flex flex-wrap items-center gap-1 text-sm">
      {steps.map((s, i) => (
        <span key={s.n} className="flex items-center gap-1">
          {i > 0 && <span className="text-neutral-600">/</span>}
          <span className={stage === s.n ? 'font-medium text-neutral-100' : 'text-neutral-500'}>
            {s.n} · {s.label}
          </span>
        </span>
      ))}
    </div>
  )
}

function AddGarmentTile({
  onStartFlow,
  onDropPending,
}: {
  onStartFlow: () => void
  onDropPending: (file: File) => void
}) {
  const { t } = useI18n()
  const { isDragging, dropHandlers } = useDropzone((files) => {
    if (files[0]) onDropPending(files[0])
  })
  return (
    <button
      type="button"
      {...dropHandlers}
      onClick={(e) => { e.stopPropagation(); onStartFlow() }}
      className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-[#333] text-neutral-500 transition hover:border-[#444] hover:text-neutral-400${isDragging ? ' border-white bg-[#161616]' : ''}`}
    >
      <Plus className="h-3.5 w-3.5" />
      <span className="mt-0.5 max-w-[56px] text-center text-[8px] leading-tight">{t('batch.addGarment')}</span>
    </button>
  )
}

export default function BatchStudioPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prepareCache = useRef(new Map<string, Promise<PreparedProduct>>())
  const cancelRef = useRef(false)
  const stopRef = useRef(false)

  const [view, setView] = useState<'input' | 'results'>('input')
  const [jobs, setJobs] = useState<Job[]>([])
  const [running, setRunning] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [stoppedForCredits, setStoppedForCredits] = useState(false)
  const [lightboxJob, setLightboxJob] = useState<Job | null>(null)
  const [zipBusy, setZipBusy] = useState(false)

  const [stage, setStage] = useState<1 | 2 | 3>(1)
  const [page, setPage] = useState(0)
  const [dir, setDir] = useState<'next' | 'prev'>('next')
  const [products, setProducts] = useState<BatchProduct[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pickModelId, setPickModelId] = useState<string | null>(null)
  const [backgroundId, setBackgroundId] = useState<string | null>(null)
  const [ratio, setRatio] = useState<Ratio>('2:3')
  const [quality, setQuality] = useState<Quality>('2k')

  const [garmentFlow, setGarmentFlow] = useState<GarmentFlow | null>(null)
  const [fileTarget, setFileTarget] = useState<AssetTarget | null>(null)
  const [assetTarget, setAssetTarget] = useState<AssetTarget | null>(null)
  const [modelPickerOpen, setModelPickerOpen] = useState(false)

  const [models, setModels] = useState<Model[]>([])
  const [backgrounds, setBackgrounds] = useState<Background[]>([])
  const [poses, setPoses] = useState<Pose[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [favIds, setFavIds] = useState<Set<string>>(new Set())
  const [productPoseFilter, setProductPoseFilter] = useState<Record<string, string>>({})
  const [modelFavIds, setModelFavIds] = useState<Set<string>>(new Set())
  const [modelFilter, setModelFilter] = useState<ModelFilter>('all')

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const [m, b, p] = await Promise.all([
        supabase.from('models').select('id,name,gender,image_url,scope').order('created_at', { ascending: false }),
        supabase.from('backgrounds').select('id,name,thumbnail_url,prompt').order('created_at', { ascending: false }),
        supabase.from('poses').select('id,name,thumbnail_url,prompt,shot_type').order('created_at', { ascending: false }),
      ])
      setModels((m.data as Model[]) ?? [])
      setBackgrounds((b.data as Background[]) ?? [])
      setPoses((p.data as Pose[]) ?? [])
      setLoadingData(false)
    })()
  }, [])

  useEffect(() => {
    listFavoritePoseIds().then(setFavIds)
    listFavoriteModelIds().then(setModelFavIds)
  }, [])

  const filteredModels = filterModels(models, modelFilter, modelFavIds)

  async function handleToggleFavorite(poseId: string) {
    const wasFav = favIds.has(poseId)
    setFavIds((prev) => {
      const next = new Set(prev)
      if (wasFav) next.delete(poseId)
      else next.add(poseId)
      return next
    })
    try {
      await toggleFavoritePose(poseId, !wasFav)
    } catch {
      setFavIds((prev) => {
        const next = new Set(prev)
        if (wasFav) next.add(poseId)
        else next.delete(poseId)
        return next
      })
    }
  }

  async function handleToggleModelFavorite(modelId: string) {
    const wasFav = modelFavIds.has(modelId)
    setModelFavIds((prev) => {
      const next = new Set(prev)
      if (wasFav) next.delete(modelId)
      else next.add(modelId)
      return next
    })
    try {
      await toggleFavoriteModel(modelId, !wasFav)
    } catch {
      setModelFavIds((prev) => {
        const next = new Set(prev)
        if (wasFav) next.add(modelId)
        else next.delete(modelId)
        return next
      })
    }
  }

  useEffect(() => {
    if (!running) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [running])

  function getPrepared(product: BatchProduct): Promise<PreparedProduct> {
    const cached = prepareCache.current.get(product.id)
    if (cached) return cached

    const promise = (async () => {
      const modelRecord = models.find((m) => m.id === product.modelId)!
      const model = await urlToScaledBase64(modelRecord.image_url)
      const clothes = await Promise.all(
        product.garments.map(async (g, idx) => {
          const { base64, mimeType } =
            g.source.kind === 'file'
              ? await fileToScaledBase64(g.source.file)
              : await urlToScaledBase64(g.source.url)
          return {
            base64,
            mimeType,
            category: g.category,
            ...(idx === 0 && product.notes.trim() ? { notes: product.notes.trim() } : {}),
          }
        })
      )
      const bg = backgrounds.find((b) => b.id === backgroundId)
      return {
        model,
        clothes,
        backgroundPrompt: bg?.prompt ?? '',
        ratio,
        quality,
        tuck: product.tuck ?? undefined,
      }
    })()

    prepareCache.current.set(product.id, promise)
    return promise
  }

  function buildJobList(): Job[] {
    const list: Job[] = []
    products.forEach((product, productIndex) => {
      product.poseIds.forEach((poseId) => {
        const pose = poses.find((p) => p.id === poseId)
        list.push({
          id: crypto.randomUUID(),
          productId: product.id,
          productIndex,
          poseId,
          poseName: pose?.name ?? poseId,
          status: 'pending',
        })
      })
    })
    return list
  }

  async function runQueue(jobList: Job[]) {
    const supabase = createClient()
    let idx = 0

    const work = async () => {
      while (true) {
        if (cancelRef.current || stopRef.current) return
        const my = idx++
        if (my >= jobList.length) return
        const job = jobList[my]
        setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'running' } : j)))
        try {
          const product = products.find((p) => p.id === job.productId)!
          const prep = await getPrepared(product)
          const pose = poses.find((p) => p.id === job.poseId)!
          const { data, error } = await supabase.functions.invoke('generate-ecom', {
            body: {
              model: prep.model,
              clothes: prep.clothes,
              backgroundPrompt: prep.backgroundPrompt,
              poses: [{ id: pose.id, prompt: pose.prompt }],
              ratio: prep.ratio,
              quality: prep.quality,
              tuck: prep.tuck,
            },
          })
          if (error) {
            let code = 'generation_failed'
            try {
              const ctx = await (error as { context?: Response }).context?.json?.()
              code = ctx?.error ?? 'generation_failed'
            } catch { /* ignore */ }
            if (code === 'insufficient_credits') {
              stopRef.current = true
              setStoppedForCredits(true)
            }
            setJobs((prev) =>
              prev.map((j) => (j.id === job.id ? { ...j, status: 'failed', errorCode: code } : j))
            )
          } else {
            const img = (data?.images as string[] | undefined)?.[0]
            setJobs((prev) =>
              prev.map((j) =>
                j.id === job.id
                  ? { ...j, status: img ? 'done' : 'failed', image: img, errorCode: img ? undefined : 'generation_failed' }
                  : j
              )
            )
          }
        } catch {
          setJobs((prev) =>
            prev.map((j) => (j.id === job.id ? { ...j, status: 'failed', errorCode: 'generation_failed' } : j))
          )
        }
      }
    }

    await Promise.all([work(), work(), work()])
  }

  async function startBatch() {
    setConfirmOpen(false)
    prepareCache.current.clear()
    const jobList = buildJobList()
    setJobs(jobList)
    cancelRef.current = false
    stopRef.current = false
    setStoppedForCredits(false)
    setRunning(true)
    setView('results')
    await runQueue(jobList)
    setRunning(false)
    router.refresh()
  }

  async function retryFailed() {
    const failed = jobs.filter((j) => j.status === 'failed')
    if (failed.length === 0) return
    setJobs((prev) =>
      prev.map((j) =>
        j.status === 'failed' ? { ...j, status: 'pending', image: undefined, errorCode: undefined } : j
      )
    )
    cancelRef.current = false
    stopRef.current = false
    setStoppedForCredits(false)
    setRunning(true)
    await runQueue(failed.map((j) => ({ ...j, status: 'pending' as const, image: undefined, errorCode: undefined })))
    setRunning(false)
    router.refresh()
  }

  function handleCancelBatch() {
    cancelRef.current = true
    setRunning(false)
  }

  async function downloadAllZip() {
    const doneJobs = jobs.filter((j) => j.status === 'done' && j.image)
    if (doneJobs.length === 0) return
    setZipBusy(true)
    try {
      const zip = new JSZip()
      await Promise.all(
        doneJobs.map(async (job) => {
          const blob = await imageToJpegBlob(job.image!)
          const safePose = job.poseName.replace(/[^a-zA-Z0-9-_]/g, '_')
          zip.file(`urun-${job.productIndex + 1}-${safePose}.jpg`, blob)
        })
      )
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'liora-batch.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } finally {
      setZipBusy(false)
    }
  }

  function updateProduct(id: string, patch: Partial<BatchProduct>) {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function addGarment(productId: string, category: GarmentCategory, source: GarmentSource) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, garments: [...p.garments, { id: crypto.randomUUID(), category, source }] }
          : p
      )
    )
  }

  function removeGarment(productId: string, garmentId: string) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, garments: p.garments.filter((g) => g.id !== garmentId) } : p
      )
    )
  }

  function updateGarmentCategory(productId: string, garmentId: string, category: GarmentCategory) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, garments: p.garments.map((g) => (g.id === garmentId ? { ...g, category } : g)) }
          : p
      )
    )
  }

  function selectGarmentCategory(productId: string, category: GarmentCategory) {
    if (garmentFlow?.productId === productId && garmentFlow.pendingFile) {
      addGarment(productId, category, fileSource(garmentFlow.pendingFile))
      setGarmentFlow(null)
      return
    }
    setGarmentFlow({ productId, step: 'source', category })
  }

  function openGarmentCategoryMenu(productId: string) {
    setGarmentFlow({ productId, step: 'category' })
  }

  function openGarmentCategoryMenuWithFile(productId: string, file: File) {
    setGarmentFlow({ productId, step: 'category', pendingFile: file })
  }

  function handleFileInput(files: FileList | null) {
    if (!files?.[0] || !fileTarget) return
    addGarment(fileTarget.productId, fileTarget.category, fileSource(files[0]))
    setFileTarget(null)
    setGarmentFlow(null)
  }

  function handleAssetSelect(asset: Asset) {
    if (!assetTarget || !asset.signedUrl) return
    addGarment(assetTarget.productId, assetTarget.category, {
      kind: 'asset',
      url: asset.signedUrl,
      assetId: asset.id,
    })
    setAssetTarget(null)
    setGarmentFlow(null)
  }

  function togglePose(productId: string, poseId: string) {
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

  function applyPosesToAll(sourceProductId: string) {
    const source = products.find((p) => p.id === sourceProductId)
    if (!source) return
    setProducts((prev) => prev.map((p) => ({ ...p, poseIds: [...source.poseIds] })))
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(products.map((p) => p.id)) : new Set())
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function assignModelToSelected() {
    if (!pickModelId) return
    setProducts((prev) =>
      prev.map((p) => (selectedIds.has(p.id) ? { ...p, modelId: pickModelId } : p))
    )
  }

  function removeProduct(id: string) {
    setProducts((prev) => {
      const nextLength = prev.length - 1
      setPage((p) => Math.min(p, Math.max(0, Math.ceil(nextLength / PER_PAGE) - 1)))
      return prev.filter((p) => p.id !== id)
    })
  }

  function goPrevPage() {
    setDir('prev')
    setPage((p) => Math.max(0, p - 1))
  }

  function goNextPage() {
    setDir('next')
    setPage((p) => Math.min(totalPages - 1, p + 1))
  }

  function addProduct() {
    if (products.length >= 50) return
    setDir('next')
    setPage(Math.floor(products.length / PER_PAGE))
    setProducts((prev) => [...prev, emptyProduct()])
  }

  const totalPages = Math.max(1, Math.ceil(products.length / PER_PAGE))
  const pageProducts = products.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
  const showAddTileInGrid = page === totalPages - 1 && pageProducts.length < PER_PAGE && products.length < 50

  const canCompleteStage1 =
    products.length > 0 &&
    products.every((p) => p.garments.length > 0) &&
    products.every((p) => p.poseIds.length > 0)

  const canGoStage3 = products.every((p) => p.modelId !== null)
  const canStart = backgroundId !== null

  const totalJobs = products.reduce((sum, p) => sum + p.poseIds.length, 0)
  const summaryText = t('batch.summary').replace(/\{count\}/g, String(totalJobs))
  const selectedCountText = t('batch.selectedCount').replace(/\{count\}/g, String(selectedIds.size))
  const atMax = products.length >= 50
  const allSelected = products.length > 0 && selectedIds.size === products.length

  const completedCount = jobs.filter((j) => j.status === 'done' || j.status === 'failed').length
  const progressPct = jobs.length > 0 ? (completedCount / jobs.length) * 100 : 0
  const hasFailedJobs = jobs.some((j) => j.status === 'failed')
  const hasDoneJobs = jobs.some((j) => j.status === 'done' && j.image)
  const confirmMsg = t('batch.confirmMsg').replace(/\{count\}/g, String(totalJobs))
  const progressText = t('batch.progress')
    .replace('{done}', String(completedCount))
    .replace('{total}', String(jobs.length))

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <p className="mb-2 text-xs text-neutral-500">{t('batch.title')}</p>

      {view === 'input' && <StageIndicator stage={stage} />}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => { handleFileInput(e.target.files); e.target.value = '' }}
      />

      {/* STAGE 1 */}
      {view === 'input' && stage === 1 && (
        <>
          <div className="min-h-[560px]">
            <div
              key={page}
              className="grid gap-3"
              style={{
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                animation: `${dir === 'next' ? 'batchSlideNext' : 'batchSlidePrev'} 260ms ease-out`,
              }}
            >
            {Array.from({ length: PER_PAGE }, (_, slotIndex) => {
              const product = pageProducts[slotIndex]
              if (product) {
                const cardFilter = (productPoseFilter[product.id] ?? 'all') as PoseFilter
                const cardPoses = filterPoses(poses, cardFilter, favIds)
                return (
              <div
                key={product.id}
                className="flex h-[560px] min-w-0 flex-col overflow-y-auto rounded-xl border border-[#242424] bg-[#141414] p-3"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-200">
                    {locale === 'tr' ? 'Ürün' : 'Product'} {page * PER_PAGE + slotIndex + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeProduct(product.id)}
                    className="text-neutral-600 hover:text-red-400"
                    aria-label="Sil"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Garments */}
                <p className="mb-1.5 text-[10px] text-neutral-500">
                  {locale === 'tr' ? 'Parçalar' : 'Items'}
                </p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {product.garments.map((g) => (
                    <div key={g.id} className="relative w-16">
                      <div className="h-16 w-16 overflow-hidden rounded-lg border border-[#242424]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={garmentPreview(g.source)} alt="" className="h-full w-full object-cover" />
                      </div>
                      <select
                        value={g.category}
                        onChange={(e) => updateGarmentCategory(product.id, g.id, e.target.value as GarmentCategory)}
                        className="mt-0.5 w-full rounded border border-[#242424] bg-[#141414] px-0.5 py-0 text-[7px] text-neutral-300 outline-none"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{t(`batch.cat.${cat}` as TranslationKey)}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeGarment(product.id, g.id)}
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/80"
                      >
                        <X className="h-2.5 w-2.5 text-white" />
                      </button>
                    </div>
                  ))}

                  <div className="relative">
                    <AddGarmentTile
                      onStartFlow={() => openGarmentCategoryMenu(product.id)}
                      onDropPending={(file) => openGarmentCategoryMenuWithFile(product.id, file)}
                    />
                    {garmentFlow?.productId === product.id && garmentFlow.step === 'category' && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setGarmentFlow(null)} />
                        <div className="absolute left-0 top-full z-20 mt-1 w-28 rounded-lg border border-[#242424] bg-[#1c1c1c] py-1 shadow-lg">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); selectGarmentCategory(product.id, cat) }}
                              className="block w-full px-2 py-1 text-left text-[10px] text-neutral-300 hover:bg-[#242424]"
                            >
                              {t(`batch.cat.${cat}` as TranslationKey)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    {garmentFlow?.productId === product.id && garmentFlow.step === 'source' && garmentFlow.category && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setGarmentFlow(null)} />
                        <div className="absolute left-0 top-full z-20 mt-1 w-32 rounded-lg border border-[#242424] bg-[#1c1c1c] py-1 shadow-lg">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setFileTarget({ productId: product.id, category: garmentFlow.category! })
                              setGarmentFlow(null)
                              fileInputRef.current?.click()
                            }}
                            className="block w-full px-2 py-1 text-left text-[10px] text-neutral-300 hover:bg-[#242424]"
                          >
                            {t('assets.fromComputer')}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAssetTarget({ productId: product.id, category: garmentFlow.category! })
                              setGarmentFlow(null)
                            }}
                            className="block w-full px-2 py-1 text-left text-[10px] text-neutral-300 hover:bg-[#242424]"
                          >
                            {t('assets.fromAssets')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Poses */}
                <p className="mb-1 text-[10px] text-neutral-500">{t('batch.poses')}</p>
                {loadingData ? (
                  <p className="text-[10px] text-neutral-600">{t('ecom.loading')}</p>
                ) : (
                  <>
                    <select
                      value={cardFilter}
                      onChange={(e) => setProductPoseFilter((prev) => ({ ...prev, [product.id]: e.target.value }))}
                      className="mb-1.5 w-full rounded border border-[#242424] bg-[#0f0f0f] px-1 py-0.5 text-[9px] text-neutral-300 outline-none focus:border-[#333]"
                    >
                      {POSE_FILTERS.map((f) => (
                        <option key={f} value={f}>{t(POSE_FILTER_KEYS[f])}</option>
                      ))}
                    </select>
                    {cardPoses.length === 0 ? (
                      <p className="text-[10px] text-neutral-600">{t('ecom.empty')}</p>
                    ) : (
                      <div className="max-h-[230px] overflow-y-auto">
                        <div className="flex flex-wrap gap-1.5">
                          {cardPoses.map((pose) => {
                        const selected = product.poseIds.includes(pose.id)
                        return (
                          <div
                            key={pose.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => togglePose(product.id, pose.id)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePose(product.id, pose.id) } }}
                            className={`relative w-[56px] shrink-0 cursor-pointer overflow-hidden rounded-md text-left transition ${selected ? 'ring-2 ring-sky-400' : 'ring-1 ring-[#242424]'}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={pose.thumbnail_url} alt={pose.name} className="aspect-[3/4] w-[56px] object-cover" />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleToggleFavorite(pose.id) }}
                              className="absolute left-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/50"
                              aria-label="Favori"
                            >
                              <Star className={`h-2.5 w-2.5 ${favIds.has(pose.id) ? 'fill-amber-400 text-amber-400' : 'text-white/80'}`} />
                            </button>
                            {selected && (
                              <span className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-400">
                                <Check className="h-2 w-2 text-[#0a0a0a]" />
                              </span>
                            )}
                            <p className="truncate px-0.5 py-0.5 text-[10px] text-neutral-400">{pose.name}</p>
                          </div>
                        )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => applyPosesToAll(product.id)}
                  disabled={product.poseIds.length === 0}
                  className="mt-1.5 text-[9px] text-sky-400/80 hover:text-sky-400 disabled:opacity-30"
                >
                  {t('batch.applyPosesToAll')}
                </button>

                {/* Detail */}
                <button
                  type="button"
                  onClick={() => updateProduct(product.id, { showDetail: !product.showDetail })}
                  className={`mt-3 text-[10px] transition ${hasDetailCustom(product) ? 'text-sky-400' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  {t('batch.detail')}
                </button>
                {product.showDetail && (
                  <div className="mt-2 space-y-2 border-t border-[#242424] pt-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => updateProduct(product.id, { tuck: product.tuck === 'out' ? null : 'out' })}
                        className={`rounded border px-2 py-0.5 text-[9px] ${product.tuck === 'out' ? 'border-white text-neutral-100' : 'border-[#2a2a2a] text-neutral-500'}`}
                      >
                        {t('ecom.tuck.out')}
                      </button>
                      <button
                        type="button"
                        onClick={() => updateProduct(product.id, { tuck: product.tuck === 'in' ? null : 'in' })}
                        className={`rounded border px-2 py-0.5 text-[9px] ${product.tuck === 'in' ? 'border-white text-neutral-100' : 'border-[#2a2a2a] text-neutral-500'}`}
                      >
                        {t('ecom.tuck.in')}
                      </button>
                    </div>
                    <textarea
                      value={product.notes}
                      onChange={(e) => updateProduct(product.id, { notes: e.target.value })}
                      placeholder={t('ecom.stylingNotes.placeholder')}
                      rows={2}
                      className="min-h-[48px] w-full rounded-lg border border-[#242424] bg-[#141414] p-1.5 text-[10px] text-neutral-100 outline-none placeholder:text-neutral-600"
                    />
                  </div>
                )}
              </div>
                )
              }
              if (showAddTileInGrid && slotIndex === pageProducts.length) {
                return (
                  <button
                    key="add-tile"
                    type="button"
                    onClick={addProduct}
                    className="flex h-[560px] flex-col items-center justify-center rounded-xl border border-dashed border-[#333] text-neutral-500 transition hover:border-[#444] hover:text-neutral-400"
                  >
                    <Plus className="h-5 w-5" />
                    <span className="mt-1 text-[10px]">{locale === 'tr' ? 'Ürün ekle' : 'Add product'}</span>
                  </button>
                )
              }
              return <div key={`empty-${slotIndex}`} className="h-[560px]" aria-hidden />
            })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={goPrevPage}
              disabled={page === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs text-neutral-300 hover:bg-[#161616] disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t('batch.back')}
            </button>
            <span className="text-xs text-neutral-500">
              {locale === 'tr' ? 'Sayfa' : 'Page'} {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={goNextPage}
              disabled={page >= totalPages - 1}
              className="inline-flex items-center gap-1 rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs text-neutral-300 hover:bg-[#161616] disabled:opacity-40"
            >
              {t('batch.next')}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={addProduct}
              disabled={atMax}
              className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs text-neutral-300 hover:bg-[#161616] disabled:opacity-40"
            >
              {t('batch.addProduct')}
            </button>
          </div>
          {atMax && (
            <p className="mt-2 text-center text-[11px] text-neutral-600">{t('batch.maxProducts')}</p>
          )}

          <div className="mt-4 flex items-end justify-between">
            <span className="text-xs text-neutral-500">{products.length} / 50 {locale === 'tr' ? 'ürün' : 'products'}</span>
            <div className="text-right">
              {!canCompleteStage1 && products.length > 0 && (
                <p className="mb-1 text-[10px] text-amber-400">{t('batch.needPosePerProduct')}</p>
              )}
              <button
                type="button"
                onClick={() => setStage(2)}
                disabled={!canCompleteStage1}
                className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-40"
              >
                {t('batch.completeUpload')}
              </button>
            </div>
          </div>
        </>
      )}

      {/* STAGE 2 */}
      {view === 'input' && stage === 2 && (
        <>
          <div className="sticky top-16 z-10 mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#242424] bg-[#141414] p-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleSelectAll(e.target.checked)}
                className="rounded border-[#444]"
              />
              {t('batch.selectAll')}
            </label>
            <span className="text-xs text-neutral-500">{selectedCountText}</span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setModelPickerOpen((v) => !v)}
                  className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs text-neutral-300 hover:bg-[#1c1c1c]"
                >
                  {t('batch.chooseModel')}
                  {pickModelId && (
                    <span className="ml-1 text-neutral-500">
                      ({models.find((m) => m.id === pickModelId)?.name})
                    </span>
                  )}
                </button>
                {modelPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setModelPickerOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-[#242424] bg-[#1c1c1c] p-2 shadow-lg">
                      <select
                        value={modelFilter}
                        onChange={(e) => setModelFilter(e.target.value as ModelFilter)}
                        className="mb-2 w-full rounded border border-[#333] bg-[#0f0f0f] px-1.5 py-0.5 text-[10px] text-neutral-300 outline-none focus:border-[#444]"
                      >
                        {MODEL_FILTERS.map((f) => (
                          <option key={f} value={f}>{t(MODEL_FILTER_KEYS[f])}</option>
                        ))}
                      </select>
                      {filteredModels.length === 0 ? (
                        <p className="py-2 text-center text-[10px] text-neutral-600">{t('ecom.empty')}</p>
                      ) : (
                        <div className="grid max-h-48 grid-cols-3 gap-1 overflow-y-auto">
                          {filteredModels.map((m) => (
                            <div
                              key={m.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => { setPickModelId(m.id); setModelPickerOpen(false) }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  setPickModelId(m.id)
                                  setModelPickerOpen(false)
                                }
                              }}
                              className={`relative cursor-pointer overflow-hidden rounded-lg ring-1 ${pickModelId === m.id ? 'ring-white' : 'ring-[#333]'}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={m.image_url} alt={m.name} className="aspect-[3/4] w-full object-cover" />
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleToggleModelFavorite(m.id) }}
                                className="absolute left-0.5 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-black/50"
                                aria-label="Favori"
                              >
                                <Star className={`h-2.5 w-2.5 ${modelFavIds.has(m.id) ? 'fill-amber-400 text-amber-400' : 'text-white/80'}`} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={assignModelToSelected}
                disabled={!pickModelId || selectedIds.size === 0}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-[#0a0a0a] disabled:opacity-40"
              >
                {t('batch.assignSelected')}
              </button>
            </div>
          </div>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
          >
            {products.map((product) => {
              const selected = selectedIds.has(product.id)
              const preview = firstGarmentPreview(product)
              const model = models.find((m) => m.id === product.modelId)
              return (
                <div
                  key={product.id}
                  className={`relative rounded-xl border bg-[#141414] p-2 transition ${selected ? 'ring-2 ring-sky-400' : 'border-[#242424]'}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSelected(product.id)}
                    className="absolute left-2 top-2 z-10 rounded border-[#444]"
                  />
                  <div className="aspect-square overflow-hidden rounded-lg bg-[#1c1c1c]">
                    {preview ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={preview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-neutral-600">—</div>
                    )}
                  </div>
                  <p className="mt-1 text-[10px] text-neutral-400">{product.poseIds.length} {locale === 'tr' ? 'poz' : 'poses'}</p>
                  {model ? (
                    <div className="mt-1 flex items-center gap-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={model.image_url} alt="" className="h-4 w-4 rounded object-cover" />
                      <span className="truncate text-[9px] text-neutral-300">{model.name}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-[9px] text-neutral-600">{t('batch.noModel')}</p>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => setStage(1)}
              className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-neutral-300 hover:bg-[#161616]"
            >
              {t('batch.back')}
            </button>
            <button
              type="button"
              onClick={() => setStage(3)}
              disabled={!canGoStage3}
              className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-40"
            >
              {t('batch.next')}
            </button>
          </div>
        </>
      )}

      {/* STAGE 3 */}
      {view === 'input' && stage === 3 && (
        <>
          <div className="rounded-2xl border border-[#242424] bg-[#141414] p-4">
            <p className="mb-2 text-xs text-neutral-400">{t('batch.background')}</p>
            {loadingData ? (
              <p className="text-xs text-neutral-600">{t('ecom.loading')}</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {backgrounds.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBackgroundId(b.id)}
                    className={`overflow-hidden rounded-xl text-left transition ${backgroundId === b.id ? 'ring-2 ring-white' : 'ring-1 ring-[#242424]'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.thumbnail_url} alt={b.name} className="aspect-[3/4] w-full object-cover" />
                    <p className="truncate p-1 text-[10px] text-neutral-300">{b.name}</p>
                  </button>
                ))}
              </div>
            )}

            <p className="mb-2 mt-5 text-xs text-neutral-400">{t('ecom.size.ratio')}</p>
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

            <p className="mb-2 mt-4 text-xs text-neutral-400">{t('ecom.size.quality')}</p>
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

            <div className="mt-5 rounded-xl border border-[#242424] bg-[#0a0a0a] p-3">
              <p className="text-sm text-neutral-300">{summaryText}</p>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() => setStage(2)}
              className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-neutral-300 hover:bg-[#161616]"
            >
              {t('batch.back')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!canStart}
              className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-40"
            >
              {t('batch.start')}
            </button>
          </div>
        </>
      )}

      {/* RESULTS */}
      {view === 'results' && (
        <>
          <div className="mb-4 rounded-xl border border-[#242424] bg-[#141414] p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-neutral-300">{progressText}</span>
              {running && (
                <button
                  type="button"
                  onClick={handleCancelBatch}
                  className="rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-xs text-neutral-300 hover:bg-[#161616]"
                >
                  {t('batch.cancel')}
                </button>
              )}
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[#242424]">
              <div
                className="h-full bg-sky-400 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {stoppedForCredits && (
              <p className="mt-2 text-xs text-amber-400">{t('batch.creditsStopped')}</p>
            )}
          </div>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
          >
            {jobs.map((job) => (
              <div
                key={job.id}
                className="overflow-hidden rounded-xl border border-[#242424] bg-[#141414]"
              >
                <div className="relative aspect-[3/4] bg-[#0a0a0a]">
                  {job.status === 'pending' && (
                    <div className="flex h-full items-center justify-center bg-[#141414] opacity-40" />
                  )}
                  {job.status === 'running' && (
                    <div className="flex h-full items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                    </div>
                  )}
                  {job.status === 'done' && job.image && (
                    <button
                      type="button"
                      onClick={() => setLightboxJob(job)}
                      className="block h-full w-full"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={job.image} alt="" className="h-full w-full object-cover" />
                    </button>
                  )}
                  {job.status === 'failed' && (
                    <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
                      <AlertCircle className="h-5 w-5 text-red-400/80" />
                      <p className="text-[10px] text-neutral-500">{t(jobErrorKey(job.errorCode))}</p>
                    </div>
                  )}
                </div>
                <p className="truncate px-2 py-1.5 text-[10px] text-neutral-400">
                  {productLabel(t, job)}
                </p>
              </div>
            ))}
          </div>

          {!running && (
            <div className="mt-6 flex flex-wrap gap-3">
              {hasDoneJobs && (
                <button
                  type="button"
                  onClick={downloadAllZip}
                  disabled={zipBusy}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-40"
                >
                  {zipBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {t('batch.downloadZip')}
                </button>
              )}
              {hasFailedJobs && (
                <button
                  type="button"
                  onClick={retryFailed}
                  className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-neutral-300 hover:bg-[#161616]"
                >
                  {t('batch.retryFailed')}
                </button>
              )}
              <button
                type="button"
                onClick={() => { setView('input'); setJobs([]) }}
                className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-neutral-300 hover:bg-[#161616]"
              >
                {t('batch.back')}
              </button>
            </div>
          )}
        </>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#242424] bg-[#141414] p-5">
            <p className="text-sm text-neutral-200">{confirmMsg}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-neutral-300 hover:bg-[#161616]"
              >
                {t('batch.abort')}
              </button>
              <button
                type="button"
                onClick={startBatch}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#0a0a0a]"
              >
                {t('batch.continue')}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxJob?.image && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setLightboxJob(null)}
            aria-label="Kapat"
            className="absolute right-5 top-5 text-neutral-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxJob.image} alt="" className="max-h-[70vh] w-auto rounded-xl" />
          <button
            type="button"
            onClick={() =>
              downloadAsJpg(
                lightboxJob.image!,
                `urun-${lightboxJob.productIndex + 1}-${lightboxJob.poseName}`
              )
            }
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-[#0a0a0a]"
          >
            <Download className="h-4 w-4" />
            {t('batch.download')}
          </button>
        </div>
      )}

      <AssetPicker
        open={assetTarget !== null}
        onClose={() => setAssetTarget(null)}
        onSelect={handleAssetSelect}
      />
    </main>
  )
}
