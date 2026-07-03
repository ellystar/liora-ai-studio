'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Plus, ArrowRight, ArrowLeft, Download, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import type { TranslationKey } from '@/lib/i18n/dictionaries'
import { createClient } from '@/lib/supabase/client'
import { fileToScaledBase64, urlToScaledBase64 } from '@/lib/image/scale'
import { downloadAsJpg } from '@/lib/image/download'
import { useDropzone } from '@/lib/hooks/use-dropzone'
import { AssetPicker } from '@/components/asset-picker'
import { saveAsset, type Asset } from '@/lib/assets/assets'
import { ratios, qualities, type Category, type Ratio, type Quality } from '@/lib/ecom/mock-data'
import { PoseFilterTabs } from '@/components/pose-filter-tabs'
import { ModelFilterTabs } from '@/components/model-filter-tabs'
import { UserModelUpload } from '@/components/user-model-upload'
import { filterPoses, listFavoritePoseIds, toggleFavoritePose, type PoseFilter } from '@/lib/poses/favorites'
import { filterModels, listFavoriteModelIds, toggleFavoriteModel, type ModelFilter } from '@/lib/models/favorites'
import type { NewUserModel } from '@/lib/models/user-models'

type Model = { id: string; name: string; gender: string | null; image_url: string; scope: string }
type Background = { id: string; name: string; thumbnail_url: string; prompt: string }
type Pose = { id: string; name: string; thumbnail_url: string; prompt: string; shot_type?: string | null; category?: string | null; direction?: string | null }
type ClothItem = {
  id: string
  category: Category | null
  notes: string
  assetId?: string
  savedAsAsset?: boolean
  // Front angle (required)
  frontFile?: File
  frontPreviewUrl?: string
  frontUrl?: string
  frontDetailFile?: File
  frontDetailPreviewUrl?: string
  frontDetailUrl?: string
  // Back angle (optional)
  backFile?: File
  backPreviewUrl?: string
  backUrl?: string
  backDetailFile?: File
  backDetailPreviewUrl?: string
  backDetailUrl?: string
}

type Angle = 'front' | 'back'
type SlotKind = 'main' | 'detail'
type SlotTarget = { clothId: string; angle: Angle; kind: SlotKind }

function buildSlotPatch(
  angle: Angle,
  kind: SlotKind,
  v: { file?: File; preview?: string; url?: string }
): Partial<ClothItem> {
  if (angle === 'front' && kind === 'main') return { frontFile: v.file, frontPreviewUrl: v.preview, frontUrl: v.url }
  if (angle === 'front' && kind === 'detail') return { frontDetailFile: v.file, frontDetailPreviewUrl: v.preview, frontDetailUrl: v.url }
  if (angle === 'back' && kind === 'main') return { backFile: v.file, backPreviewUrl: v.preview, backUrl: v.url }
  return { backDetailFile: v.file, backDetailPreviewUrl: v.preview, backDetailUrl: v.url }
}

function slotPreview(c: ClothItem, angle: Angle, kind: SlotKind): string | undefined {
  if (angle === 'front' && kind === 'main') return c.frontPreviewUrl
  if (angle === 'front' && kind === 'detail') return c.frontDetailPreviewUrl
  if (angle === 'back' && kind === 'main') return c.backPreviewUrl
  return c.backDetailPreviewUrl
}

const STEPS = ['clothes', 'model', 'background', 'pose', 'size'] as const
const CATEGORIES: Category[] = ['top', 'bottom', 'outerwear', 'onepiece', 'shoes', 'accessory']

function ItemCard({ selected, onClick, name, imageUrl, badge, multi, isFavorite, onFavoriteToggle }: {
  selected: boolean
  onClick: () => void
  name: string
  imageUrl: string
  badge?: { text: string; own?: boolean }
  multi?: boolean
  isFavorite?: boolean
  onFavoriteToggle?: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className={`relative cursor-pointer overflow-hidden rounded-xl bg-[#141414] text-left transition ${selected ? 'border-[1.5px] border-white' : 'border border-[#242424] hover:border-[#2e2e2e]'}`}
    >
      <div className="relative aspect-[3/4] bg-[#1c1c1c]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
        {onFavoriteToggle && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFavoriteToggle() }}
            className="absolute left-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 transition hover:bg-black/70"
            aria-label="Favori"
          >
            <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-white/80'}`} />
          </button>
        )}
        {selected && (
          <span className={`absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center bg-white ${multi ? 'rounded' : 'rounded-full'}`}>
            <Check className="h-3 w-3 text-[#0a0a0a]" />
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs text-neutral-200">{name}</p>
        {badge && (
          <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] ${badge.own ? 'bg-[#1f3a2c] text-[#7fd6a8]' : 'bg-[#262626] text-neutral-400'}`}>{badge.text}</span>
        )}
      </div>
    </div>
  )
}

export default function EcomStudioPage() {
  const router = useRouter()
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const slotFileInputRef = useRef<HTMLInputElement>(null)

  const [models, setModels] = useState<Model[]>([])
  const [backgrounds, setBackgrounds] = useState<Background[]>([])
  const [poses, setPoses] = useState<Pose[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [stepIndex, setStepIndex] = useState(0)
  const [clothes, setClothes] = useState<ClothItem[]>([])
  const [modelId, setModelId] = useState<string | null>(null)
  const [bgId, setBgId] = useState<string | null>(null)
  const [poseIds, setPoseIds] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const [customPoses, setCustomPoses] = useState<string[]>([])
  const [favIds, setFavIds] = useState<Set<string>>(new Set())
  const [poseFilter, setPoseFilter] = useState<PoseFilter>('all')
  const [modelFavIds, setModelFavIds] = useState<Set<string>>(new Set())
  const [modelFilter, setModelFilter] = useState<ModelFilter>('all')
  const [modelUploadOpen, setModelUploadOpen] = useState(false)
  const [ratio, setRatio] = useState<Ratio>('2:3')
  const [quality, setQuality] = useState<Quality>('1k')
  const [showConfirm, setShowConfirm] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<string[] | null>(null)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [genProgress, setGenProgress] = useState({ done: 0, total: 0 })
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [pendingSlot, setPendingSlot] = useState<SlotTarget | null>(null)
  const [slotAssetPicker, setSlotAssetPicker] = useState<SlotTarget | null>(null)
  const [tuck, setTuck] = useState<'in' | 'out' | null>(null)

  const step = STEPS[stepIndex]

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const [m, b, p] = await Promise.all([
        supabase.from('models').select('id,name,gender,image_url,scope').order('created_at', { ascending: false }),
        supabase.from('backgrounds').select('id,name,thumbnail_url,prompt').order('created_at', { ascending: false }),
        supabase.from('poses').select('id,name,thumbnail_url,prompt,shot_type,category,direction').order('created_at', { ascending: false }),
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

  const generalPoses = poses.filter((p) => p.category !== 'shoe')
  const filteredPoses = filterPoses(generalPoses, poseFilter, favIds)
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

  function updateCloth(id: string, patch: Partial<ClothItem>) {
    setClothes((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }
  function addFiles(files: FileList | null) {
    if (!files) return
    const remaining = 6 - clothes.length
    const toAdd: ClothItem[] = Array.from(files).slice(0, remaining).map((file) => ({
      id: crypto.randomUUID(),
      category: null,
      notes: '',
      frontFile: file,
      frontPreviewUrl: URL.createObjectURL(file),
    }))
    setClothes((prev) => [...prev, ...toAdd])
  }
  function addAssetCloth(asset: Asset) {
    const signedUrl = asset.signedUrl
    if (clothes.length >= 6 || !signedUrl) return
    const category = asset.category && CATEGORIES.includes(asset.category as Category)
      ? (asset.category as Category)
      : null
    setClothes((prev) => [...prev, {
      id: crypto.randomUUID(),
      category,
      notes: '',
      assetId: asset.id,
      frontUrl: signedUrl,
      frontPreviewUrl: signedUrl,
    }])
  }
  async function handleSaveAsAsset(id: string) {
    const item = clothes.find((c) => c.id === id)
    if (!item?.frontFile || item.savedAsAsset) return
    try {
      await saveAsset(item.frontFile, { category: item.category ?? undefined })
      updateCloth(id, { savedAsAsset: true })
    } catch (e) { console.error(e) }
  }
  function removeCloth(id: string) {
    setClothes((prev) => prev.filter((c) => c.id !== id))
  }
  function setClothCategory(id: string, category: Category) {
    updateCloth(id, { category })
  }
  function setClothNotes(id: string, notes: string) {
    updateCloth(id, { notes })
  }
  function setSlotFromFile(clothId: string, angle: Angle, kind: SlotKind, file: File) {
    updateCloth(clothId, buildSlotPatch(angle, kind, { file, preview: URL.createObjectURL(file), url: undefined }))
  }
  function setSlotFromAsset(clothId: string, angle: Angle, kind: SlotKind, asset: Asset) {
    const signedUrl = asset.signedUrl
    if (!signedUrl) return
    updateCloth(clothId, buildSlotPatch(angle, kind, { file: undefined, preview: signedUrl, url: signedUrl }))
  }
  function clearSlot(clothId: string, angle: Angle, kind: SlotKind) {
    updateCloth(clothId, buildSlotPatch(angle, kind, { file: undefined, preview: undefined, url: undefined }))
  }
  function togglePose(id: string) {
    setPoseIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }
  function addCustomPose() {
    const trimmed = customInput.trim()
    if (!trimmed) return
    setCustomPoses((prev) => [...prev, trimmed])
    setCustomInput('')
  }
  function removeCustomPose(i: number) {
    setCustomPoses((prev) => prev.filter((_, idx) => idx !== i))
  }

  const selectedPoses = generalPoses.filter((p) => poseIds.includes(p.id))
  const posesToRun = [
    ...selectedPoses.map((p) => ({ id: p.id, prompt: p.prompt, shot_type: p.shot_type ?? null, direction: p.direction ?? null })),
    ...customPoses.map((txt, i) => ({ id: `custom-${i}`, prompt: txt, shot_type: null, direction: null })),
  ]

  const { isDragging, dropHandlers } = useDropzone((files) => addFiles(files))

  const canContinue =
    step === 'clothes' ? clothes.length > 0 && clothes.every((c) => c.category && (c.frontFile || c.frontUrl)) :
    step === 'model' ? modelId !== null :
    step === 'background' ? bgId !== null :
    step === 'pose' ? posesToRun.length > 0 :
    true

  function handleBack() {
    if (stepIndex === 0) { router.push('/'); return }
    setStepIndex((i) => i - 1)
  }
  function handleNext() {
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1)
  }

  async function handleGenerate() {
    setShowConfirm(false)
    setGenError(null)
    setGenerating(true)
    setGenProgress({ done: 0, total: posesToRun.length })

    let stoppedInsufficient = false
    let busy = false
    const collectedImages: string[] = []

    try {
      const supabase = createClient()

      // clothes payload: her urun icin front/back + detaylari
      const clothesPayload = await Promise.all(
        clothes.map(async (item) => {
          const front = item.frontFile
            ? await fileToScaledBase64(item.frontFile)
            : item.frontUrl ? await urlToScaledBase64(item.frontUrl) : null
          const frontDetail = item.frontDetailFile
            ? await fileToScaledBase64(item.frontDetailFile, 2048)
            : item.frontDetailUrl ? await urlToScaledBase64(item.frontDetailUrl, 2048) : null
          const back = item.backFile
            ? await fileToScaledBase64(item.backFile)
            : item.backUrl ? await urlToScaledBase64(item.backUrl) : null
          const backDetail = item.backDetailFile
            ? await fileToScaledBase64(item.backDetailFile, 2048)
            : item.backDetailUrl ? await urlToScaledBase64(item.backDetailUrl, 2048) : null

          return {
            category: item.category,
            notes: item.notes ?? '',
            front: front ? { base64: front.base64, mimeType: front.mimeType } : undefined,
            frontDetail: frontDetail ? { base64: frontDetail.base64, mimeType: frontDetail.mimeType } : undefined,
            back: back ? { base64: back.base64, mimeType: back.mimeType } : undefined,
            backDetail: backDetail ? { base64: backDetail.base64, mimeType: backDetail.mimeType } : undefined,
          }
        })
      )

      const selectedModel = models.find((m) => m.id === modelId)
      const background = backgrounds.find((b) => b.id === bgId)
      const model = await urlToScaledBase64(selectedModel!.image_url)
      const bgPrompt = background?.prompt ?? ''

      // pozlari yon'e gore ayir: front + null -> ON tarafi; back -> ARKA tarafi
      const frontPoses = posesToRun.filter((p) => p.direction !== 'back')
      const backPoses = posesToRun.filter((p) => p.direction === 'back')

      // ortak hata cozumleyici
      const readErr = async (error: unknown) => {
        let code = ''
        try { const ctx = await (error as { context: Response }).context.json(); code = ctx.error } catch {}
        if (code === 'insufficient_credits') stoppedInsufficient = true
        else if (code === 'model_busy') busy = true
      }

      // ---- ON HERO ----
      let frontHeroInput: { base64: string; mimeType: string } | null = null

      if (frontPoses.length > 0) {
        const heroPose = frontPoses[0]
        const { data, error } = await supabase.functions.invoke('generate-ecom', {
          body: {
            clothes: clothesPayload, model, backgroundPrompt: bgPrompt,
            poses: [heroPose], ratio, quality, tuck: tuck ?? undefined, side: 'front',
          },
        })
        if (error) { await readErr(error) }
        else {
          const heroImg = (data?.images as string[] | undefined)?.[0]
          if (heroImg) {
            collectedImages.push(heroImg)
            setGenProgress((p) => ({ ...p, done: p.done + 1 }))
            frontHeroInput = await urlToScaledBase64(heroImg)

            // kalan on pozlar -> on hero'dan aktar
            for (const pose of frontPoses.slice(1)) {
              if (stoppedInsufficient) break
              const { data: d, error: e } = await supabase.functions.invoke('generate-pose', {
                body: { photo: frontHeroInput, poses: [pose], tuck: tuck ?? undefined, side: 'front' },
              })
              if (e) { await readErr(e); setGenProgress((p) => ({ ...p, done: p.done + 1 })); continue }
              const img = (d?.images as string[] | undefined)?.[0]
              if (img) collectedImages.push(img)
              setGenProgress((p) => ({ ...p, done: p.done + 1 }))
            }
          }
        }
      }

      // ---- ARKA HERO ----
      if (backPoses.length > 0 && !stoppedInsufficient) {
        const backHeroPose = backPoses[0]
        let backHeroInput: { base64: string; mimeType: string } | null = null

        if (frontHeroInput) {
          // on hero'dan turet (manken/isik/ortam tutarli) + arka referanslari
          const { data, error } = await supabase.functions.invoke('generate-pose', {
            body: {
              photo: frontHeroInput, poses: [backHeroPose], tuck: tuck ?? undefined,
              side: 'back', clothes: clothesPayload,
            },
          })
          if (error) { await readErr(error) }
          else {
            const img = (data?.images as string[] | undefined)?.[0]
            if (img) {
              collectedImages.push(img)
              setGenProgress((p) => ({ ...p, done: p.done + 1 }))
              backHeroInput = await urlToScaledBase64(img)
            }
          }
        } else {
          // sadece arka poz secilmis -> arka hero'yu dogrudan generate-ecom ile arka referanstan uret
          const { data, error } = await supabase.functions.invoke('generate-ecom', {
            body: {
              clothes: clothesPayload, model, backgroundPrompt: bgPrompt,
              poses: [backHeroPose], ratio, quality, tuck: tuck ?? undefined, side: 'back',
            },
          })
          if (error) { await readErr(error) }
          else {
            const img = (data?.images as string[] | undefined)?.[0]
            if (img) {
              collectedImages.push(img)
              setGenProgress((p) => ({ ...p, done: p.done + 1 }))
              backHeroInput = await urlToScaledBase64(img)
            }
          }
        }

        // kalan arka pozlar -> arka hero'dan aktar
        if (backHeroInput) {
          for (const pose of backPoses.slice(1)) {
            if (stoppedInsufficient) break
            const { data: d, error: e } = await supabase.functions.invoke('generate-pose', {
              body: { photo: backHeroInput, poses: [pose], tuck: tuck ?? undefined, side: 'back' },
            })
            if (e) { await readErr(e); setGenProgress((p) => ({ ...p, done: p.done + 1 })); continue }
            const img = (d?.images as string[] | undefined)?.[0]
            if (img) collectedImages.push(img)
            setGenProgress((p) => ({ ...p, done: p.done + 1 }))
          }
        }
      }

      setGenerating(false)
      router.refresh()

      if (collectedImages.length > 0) {
        setResults(collectedImages)
      } else {
        setGenError(
          stoppedInsufficient ? t('ecom.error.insufficient') :
          busy ? t('ecom.error.busy') :
          t('ecom.error.blocked')
        )
      }
    } catch {
      setGenError(t('ecom.error.generic'))
      setGenerating(false)
    }
  }

  function resetFlow() {
    setStepIndex(0); setClothes([]); setModelId(null); setBgId(null)
    setPoseIds([]); setCustomInput(''); setCustomPoses([]); setRatio('2:3'); setQuality('1k'); setResults(null); setLightbox(null); setGenError(null)
    setGenProgress({ done: 0, total: 0 })
  }

  function openSlotFilePicker(clothId: string, angle: Angle, kind: SlotKind) {
    setPendingSlot({ clothId, angle, kind })
    slotFileInputRef.current?.click()
  }

  function renderMainSlot(c: ClothItem, angle: Angle) {
    const preview = slotPreview(c, angle, 'main')
    const label = angle === 'front' ? t('ecom.angle.front') : t('ecom.angle.back')
    return (
      <div>
        <p className="mb-1 text-[10px] font-medium text-neutral-300">{label}</p>
        {preview ? (
          <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => clearSlot(c.id, angle, 'main')}
              aria-label="Kaldir"
              className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70"
            >
              <X className="h-3 w-3 text-white" />
            </button>
          </div>
        ) : (
          <div className="flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#333] p-2 text-neutral-500">
            <Plus className="h-5 w-5" />
            <button
              type="button"
              onClick={() => openSlotFilePicker(c.id, angle, 'main')}
              className="w-full rounded-md border border-[#2a2a2a] px-2 py-1 text-[10px] text-neutral-300 transition hover:bg-[#1c1c1c]"
            >
              {t('assets.fromComputer')}
            </button>
            <button
              type="button"
              onClick={() => setSlotAssetPicker({ clothId: c.id, angle, kind: 'main' })}
              className="w-full rounded-md border border-[#2a2a2a] px-2 py-1 text-[10px] text-neutral-300 transition hover:bg-[#1c1c1c]"
            >
              {t('assets.fromAssets')}
            </button>
          </div>
        )}
      </div>
    )
  }

  function renderDetailSlot(c: ClothItem, angle: Angle) {
    const preview = slotPreview(c, angle, 'detail')
    const label = angle === 'front' ? t('ecom.detail.front') : t('ecom.detail.back')
    return preview ? (
      <div className="mt-2 flex items-start gap-2">
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="h-12 w-12 rounded-md object-cover" />
          <button
            type="button"
            onClick={() => clearSlot(c.id, angle, 'detail')}
            aria-label="Kaldir"
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/80"
          >
            <X className="h-2.5 w-2.5 text-white" />
          </button>
        </div>
        <p className="text-[9px] leading-snug text-neutral-500">{label}</p>
      </div>
    ) : (
      <div className="mt-2">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => openSlotFilePicker(c.id, angle, 'detail')}
            className="rounded-md border border-[#2a2a2a] px-2 py-1 text-[10px] text-neutral-400 transition hover:bg-[#1c1c1c] hover:text-neutral-200"
          >
            {label}
          </button>
          <button
            type="button"
            onClick={() => setSlotAssetPicker({ clothId: c.id, angle, kind: 'detail' })}
            className="rounded-md border border-[#2a2a2a] px-2 py-1 text-[10px] text-neutral-400 transition hover:bg-[#1c1c1c] hover:text-neutral-200"
          >
            {t('assets.fromAssets')}
          </button>
        </div>
      </div>
    )
  }

  if (generating) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
        <p className="text-sm text-neutral-400">{t('ecom.generating')}</p>
        <p className="text-sm text-neutral-500">{genProgress.done}/{genProgress.total}</p>
      </main>
    )
  }

  if (results) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium text-neutral-100">{t('ecom.result.title')}</h1>
            <p className="mt-1 text-sm text-neutral-500">{t('ecom.result.subtitle')}</p>
          </div>
          <button onClick={resetFlow} className="rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-neutral-300 hover:bg-[#161616]">
            {t('ecom.result.startOver')}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {results.map((src, i) => (
            <button key={i} onClick={() => setLightbox(i)} className="overflow-hidden rounded-xl border border-[#242424] bg-[#141414]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-[3/4] w-full object-cover" />
            </button>
          ))}
        </div>

        {lightbox !== null && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-4">
            <button onClick={() => setLightbox(null)} aria-label="Kapat" className="absolute right-5 top-5 text-neutral-400 hover:text-white">
              <X className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-4">
              <button onClick={() => setLightbox((v) => (v! > 0 ? v! - 1 : v))} disabled={lightbox === 0} aria-label="Onceki" className="text-neutral-400 disabled:opacity-30">
                <ChevronLeft className="h-8 w-8" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={results[lightbox]} alt="" className="max-h-[70vh] w-auto rounded-xl" />
              <button onClick={() => setLightbox((v) => (v! < results.length - 1 ? v! + 1 : v))} disabled={lightbox === results.length - 1} aria-label="Sonraki" className="text-neutral-400 disabled:opacity-30">
                <ChevronRight className="h-8 w-8" />
              </button>
            </div>
            <button type="button" onClick={() => downloadAsJpg(results[lightbox], `liora-ecom-${lightbox + 1}`)} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-[#0a0a0a]">
              <Download className="h-4 w-4" />
              {t('ecom.result.download')}
            </button>
          </div>
        )}
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <p className="mb-4 text-xs text-neutral-500">{t('tool.ecom.title')}</p>

      <div className="mb-1.5 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-white' : 'bg-[#2a2a2a]'}`} />
        ))}
      </div>
      <div className="mb-8 flex justify-between text-[11px]">
        {STEPS.map((s, i) => (
          <span key={s} className={i === stepIndex ? 'font-medium text-neutral-100' : 'text-neutral-600'}>
            {t(`ecom.step.${s}` as TranslationKey)}
          </span>
        ))}
      </div>

      {step === 'clothes' && (
        <div>
          <p className="text-base font-medium text-neutral-100">{t('ecom.clothes.title')}</p>
          <p className="mb-4 text-sm text-neutral-500">{t('ecom.clothes.subtitle')}</p>
          <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
          <input
            ref={slotFileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file && pendingSlot) setSlotFromFile(pendingSlot.clothId, pendingSlot.angle, pendingSlot.kind, file)
              e.target.value = ''
              setPendingSlot(null)
            }}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clothes.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-xl border border-[#242424] bg-[#141414] p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500">{t('ecom.clothes.title')}</span>
                  <button onClick={() => removeCloth(c.id)} aria-label="Kaldir" className="flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-neutral-300 hover:text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {!c.category && <p className="mb-1.5 text-[10px] text-amber-400">{t('ecom.clothes.pickCategory')}</p>}
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((cat) => (
                    <button key={cat} onClick={() => setClothCategory(c.id, cat)} className={`rounded-full px-2 py-0.5 text-[10px] transition ${c.category === cat ? 'bg-white text-[#0a0a0a]' : 'border border-[#2a2a2a] text-neutral-400 hover:text-neutral-200'}`}>
                      {t(`ecom.cat.${cat}` as TranslationKey)}
                    </button>
                  ))}
                </div>

                <div className="mt-2.5">
                  {renderMainSlot(c, 'front')}
                  {!c.frontFile && !c.frontUrl && (
                    <p className="mt-1 text-[10px] text-amber-400">{t('ecom.angle.front')}</p>
                  )}
                  {renderDetailSlot(c, 'front')}
                  {c.frontFile && (
                    <button
                      type="button"
                      onClick={() => handleSaveAsAsset(c.id)}
                      disabled={c.savedAsAsset}
                      className="mt-2 w-full rounded-lg border border-[#2a2a2a] px-2 py-1 text-[10px] text-neutral-400 transition hover:bg-[#1c1c1c] disabled:opacity-50"
                    >
                      {c.savedAsAsset ? t('assets.saved') : t('assets.saveAsAsset')}
                    </button>
                  )}
                </div>

                <div className="mt-2.5 border-t border-[#242424] pt-2.5">
                  {renderMainSlot(c, 'back')}
                  {renderDetailSlot(c, 'back')}
                  <p className="mt-1.5 text-[9px] leading-snug text-neutral-600">{t('ecom.angle.backHint')}</p>
                </div>

                <div className="mt-2.5">
                  <label className="mb-1 block text-[10px] text-neutral-500">{t('ecom.stylingNotes.label')}</label>
                  <textarea
                    value={c.notes}
                    onChange={(e) => setClothNotes(c.id, e.target.value)}
                    placeholder={t('ecom.stylingNotes.placeholder')}
                    rows={2}
                    className="min-h-[60px] w-full rounded-lg border border-[#242424] bg-[#141414] p-2 text-xs text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-[#3a3a3a]"
                  />
                </div>
              </div>
            ))}
            {clothes.length < 6 && (
              <div
                {...dropHandlers}
                className={`flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#333] p-3 text-neutral-500 transition${isDragging ? ' border-white bg-[#161616]' : ''}`}
              >
                <Plus className="h-6 w-6" />
                <div className="flex w-full flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-[#2a2a2a] px-2 py-1.5 text-[10px] text-neutral-300 transition hover:bg-[#1c1c1c]"
                  >
                    {t('assets.fromComputer')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssetPickerOpen(true)}
                    className="rounded-lg border border-[#2a2a2a] px-2 py-1.5 text-[10px] text-neutral-300 transition hover:bg-[#1c1c1c]"
                  >
                    {t('assets.fromAssets')}
                  </button>
                </div>
                <span className="text-[10px] text-neutral-600">{clothes.length} / 6</span>
              </div>
            )}
          </div>
          <p className="mt-3 text-[11px] text-neutral-600">{t('ecom.clothes.max')}</p>

          <div className="mt-6">
            <p className="text-xs text-neutral-500">{t('ecom.tuck.title')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTuck(tuck === 'out' ? null : 'out')}
                className={`rounded-lg border px-4 py-2 text-sm transition ${tuck === 'out' ? 'border-white text-neutral-100' : 'border-[#2a2a2a] text-neutral-400 hover:text-neutral-200'}`}
              >
                {t('ecom.tuck.out')}
              </button>
              <button
                type="button"
                onClick={() => setTuck(tuck === 'in' ? null : 'in')}
                className={`rounded-lg border px-4 py-2 text-sm transition ${tuck === 'in' ? 'border-white text-neutral-100' : 'border-[#2a2a2a] text-neutral-400 hover:text-neutral-200'}`}
              >
                {t('ecom.tuck.in')}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'model' && (
        <div>
          <p className="text-base font-medium text-neutral-100">{t('ecom.model.title')}</p>
          <p className="mb-4 text-sm text-neutral-500">{t('ecom.model.subtitle')}</p>
          {loadingData ? <p className="text-sm text-neutral-500">{t('ecom.loading')}</p> : (
            <>
              <ModelFilterTabs value={modelFilter} onChange={setModelFilter} className="mb-3" />
              {modelFilter === 'own' && (
                <p className="mb-3 text-xs text-neutral-500">{t('models.own.info')}</p>
              )}
              {modelFilter !== 'own' && models.length === 0 ? (
                <p className="text-sm text-neutral-500">{t('ecom.empty')}</p>
              ) : modelFilter !== 'own' && filteredModels.length === 0 ? (
                <p className="text-sm text-neutral-500">{t('ecom.empty')}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {modelFilter === 'own' && (
                    <button
                      type="button"
                      onClick={() => setModelUploadOpen(true)}
                      className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#333] bg-[#141414] text-neutral-500 transition hover:border-[#444] hover:text-neutral-400"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="mt-1 px-2 text-center text-[10px]">{t('models.upload.tile')}</span>
                    </button>
                  )}
                  {filteredModels.map((m) => (
                    <ItemCard
                      key={m.id}
                      selected={modelId === m.id}
                      onClick={() => setModelId(m.id)}
                      name={m.name}
                      imageUrl={m.image_url}
                      badge={{ text: m.scope, own: m.scope === 'own' }}
                      isFavorite={modelFavIds.has(m.id)}
                      onFavoriteToggle={() => handleToggleModelFavorite(m.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === 'background' && (
        <div>
          <p className="text-base font-medium text-neutral-100">{t('ecom.bg.title')}</p>
          <p className="mb-4 text-sm text-neutral-500">{t('ecom.bg.subtitle')}</p>
          {loadingData ? <p className="text-sm text-neutral-500">{t('ecom.loading')}</p> : backgrounds.length === 0 ? <p className="text-sm text-neutral-500">{t('ecom.empty')}</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {backgrounds.map((b) => (
                <ItemCard key={b.id} selected={bgId === b.id} onClick={() => setBgId(b.id)} name={b.name} imageUrl={b.thumbnail_url} />
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'pose' && (
        <div>
          <p className="text-base font-medium text-neutral-100">{t('ecom.pose.title')}</p>
          <p className="mb-4 text-sm text-neutral-500">{t('ecom.pose.subtitle')}</p>

          <p className="mb-2 text-sm font-medium text-neutral-200">{t('poses.presetTitle')}</p>
          <PoseFilterTabs value={poseFilter} onChange={setPoseFilter} className="mb-3" />
          {loadingData ? <p className="text-sm text-neutral-500">{t('ecom.loading')}</p> : generalPoses.length === 0 ? <p className="text-sm text-neutral-500">{t('ecom.empty')}</p> : filteredPoses.length === 0 ? (
            <p className="text-sm text-neutral-500">{t('ecom.empty')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {filteredPoses.map((p) => (
                <ItemCard
                  key={p.id}
                  selected={poseIds.includes(p.id)}
                  onClick={() => togglePose(p.id)}
                  name={p.name}
                  imageUrl={p.thumbnail_url}
                  multi
                  isFavorite={favIds.has(p.id)}
                  onFavoriteToggle={() => handleToggleFavorite(p.id)}
                />
              ))}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-[#242424] bg-[#141414] p-4">
            <p className="mb-3 text-sm font-medium text-neutral-200">{t('poses.customTitle')}</p>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addCustomPose() } }}
              placeholder={t('poses.customPlaceholder')}
              rows={4}
              className="min-h-[90px] w-full rounded-lg border border-[#242424] bg-[#141414] p-3 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-[#3a3a3a]"
            />
            <button
              type="button"
              onClick={addCustomPose}
              disabled={!customInput.trim()}
              className="mt-2 rounded-lg border border-[#2a2a2a] px-4 py-1.5 text-sm text-neutral-200 transition hover:bg-[#1c1c1c] disabled:opacity-40"
            >
              {t('poses.addBtn')}
            </button>
            {customPoses.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-neutral-500">{t('poses.customAdded')}</p>
                <div className="flex flex-wrap gap-2">
                  {customPoses.map((txt, i) => (
                    <span key={i} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#2a2a2a] bg-[#1c1c1c] px-2.5 py-1 text-xs text-neutral-300">
                      <span className="truncate">{txt}</span>
                      <button type="button" onClick={() => removeCustomPose(i)} aria-label="Kaldir" className="shrink-0 text-neutral-500 hover:text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 'size' && (
        <div>
          <p className="text-base font-medium text-neutral-100">{t('ecom.size.title')}</p>
          <p className="mb-5 text-sm text-neutral-500">{t('ecom.size.subtitle')}</p>
          <p className="mb-2 text-xs text-neutral-400">{t('ecom.size.ratio')}</p>
          <div className="mb-6 flex flex-wrap gap-2">
            {ratios.map((r) => (
              <button key={r} onClick={() => setRatio(r)} className={`rounded-lg px-4 py-2 text-sm transition ${ratio === r ? 'bg-white text-[#0a0a0a]' : 'border border-[#2a2a2a] text-neutral-300 hover:bg-[#161616]'}`}>{r}</button>
            ))}
          </div>
          <p className="mb-2 text-xs text-neutral-400">{t('ecom.size.quality')}</p>
          <div className="flex flex-wrap gap-2">
            {qualities.map((q) => (
              <button key={q} onClick={() => setQuality(q)} className={`rounded-lg px-4 py-2 text-sm uppercase transition ${quality === q ? 'bg-white text-[#0a0a0a]' : 'border border-[#2a2a2a] text-neutral-300 hover:bg-[#161616]'}`}>{q}</button>
            ))}
          </div>
        </div>
      )}

      {genError && <p className="mt-6 text-sm text-red-400">{genError}</p>}

      <div className="mt-8 flex items-center justify-between">
        <button onClick={handleBack} className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-neutral-300 hover:bg-[#161616]">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>
        {step === 'size' ? (
          <button onClick={() => setShowConfirm(true)} className="rounded-lg bg-white px-6 py-2 text-sm font-medium text-[#0a0a0a]">
            {t('ecom.generate')}
          </button>
        ) : (
          <button onClick={handleNext} disabled={!canContinue} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-5 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-40">
            {t('common.continue')}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#242424] bg-[#141414] p-6 text-center">
            <p className="text-base font-medium text-neutral-100">{t('ecom.confirm.title')}</p>
            <p className="mt-2 text-sm text-neutral-400">{t('ecom.confirm.body')}</p>
            <p className="mt-4 text-3xl font-medium text-white">{posesToRun.length} <span className="text-base text-neutral-400">{t('nav.credits')}</span></p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 rounded-lg border border-[#2a2a2a] py-2.5 text-sm text-neutral-300">{t('ecom.confirm.cancel')}</button>
              <button onClick={handleGenerate} className="flex-1 rounded-lg bg-white py-2.5 text-sm font-medium text-[#0a0a0a]">{t('ecom.confirm.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      <AssetPicker
        open={assetPickerOpen}
        onClose={() => setAssetPickerOpen(false)}
        onSelect={addAssetCloth}
      />

      <AssetPicker
        open={slotAssetPicker !== null}
        onClose={() => setSlotAssetPicker(null)}
        onSelect={(asset) => {
          if (slotAssetPicker) setSlotFromAsset(slotAssetPicker.clothId, slotAssetPicker.angle, slotAssetPicker.kind, asset)
          setSlotAssetPicker(null)
        }}
      />

      <UserModelUpload
        open={modelUploadOpen}
        onClose={() => setModelUploadOpen(false)}
        onAdded={(m: NewUserModel) => {
          setModels((prev) => [m, ...prev])
          setModelId(m.id)
        }}
      />
    </main>
  )
}
