'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, ArrowRight, ArrowLeft } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import type { TranslationKey } from '@/lib/i18n/dictionaries'
import { createClient } from '@/lib/supabase/client'
import { fileToScaledBase64, urlToScaledBase64 } from '@/lib/image/scale'
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
import { SelectCard } from '@/components/studio/select-card'
import { UploadTile } from '@/components/studio/upload-tile'
import { CreditConfirmDialog } from '@/components/studio/credit-confirm-dialog'
import { ResultGrid } from '@/components/studio/result-grid'
import { Lightbox } from '@/components/studio/lightbox'

type Model = { id: string; name: string; gender: string | null; image_url: string; scope: string }
type Background = {
  id: string
  name: string
  thumbnail_url: string
  prompt: string
  owner_id?: string | null
  image_path?: string | null
  source?: string | null
  signedUrl?: string
}
type BackgroundFilter = 'preset' | 'saved'
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
  const [bgFilter, setBgFilter] = useState<BackgroundFilter>('preset')
  const [customBgPrompt, setCustomBgPrompt] = useState('')
  const [usedBgPrompt, setUsedBgPrompt] = useState('')
  const [savedBgIndices, setSavedBgIndices] = useState<Set<number>>(new Set())
  const [savingBgIndex, setSavingBgIndex] = useState<number | null>(null)
  const [bgSaveError, setBgSaveError] = useState<string | null>(null)
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
        supabase.from('backgrounds').select('id,name,thumbnail_url,prompt,owner_id,image_path,source').order('created_at', { ascending: false }),
        supabase.from('poses').select('id,name,thumbnail_url,prompt,shot_type,category,direction').order('created_at', { ascending: false }),
      ])
      setModels((m.data as Model[]) ?? [])
      const bgRows = (b.data as Background[]) ?? []
      const bgWithUrls = await Promise.all(
        bgRows.map(async (row) => {
          if (row.source === 'user' && row.image_path) {
            const { data: signed } = await supabase.storage.from('backgrounds').createSignedUrl(row.image_path, 3600)
            return { ...row, signedUrl: signed?.signedUrl }
          }
          return row
        })
      )
      setBackgrounds(bgWithUrls)
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
  const presetBackgrounds = backgrounds.filter((b) => !b.owner_id)
  const savedBackgrounds = backgrounds.filter((b) => b.source === 'user')
  const filteredBackgrounds = bgFilter === 'preset' ? presetBackgrounds : savedBackgrounds

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
  function selectBackground(id: string) {
    setBgId(id)
    setCustomBgPrompt('')
  }
  function handleCustomBgPromptChange(value: string) {
    setCustomBgPrompt(value)
    if (value.trim()) setBgId(null)
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
    step === 'background' ? (bgId !== null || customBgPrompt.trim().length > 0) :
    step === 'pose' ? posesToRun.length > 0 :
    true

  function handleBack() {
    if (stepIndex === 0) { router.push('/'); return }
    setStepIndex((i) => i - 1)
  }
  function handleNext() {
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1)
  }

  async function handleSaveBackground(imgSrc: string, index: number) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSavingBgIndex(index)
    setBgSaveError(null)
    try {
      const blob = await fetch(imgSrc).then((r) => r.blob())
      const path = `user/${user.id}/${crypto.randomUUID()}.jpg`
      const { error: uploadErr } = await supabase.storage.from('backgrounds').upload(path, blob, {
        upsert: false,
        contentType: 'image/jpeg',
      })
      if (uploadErr) throw uploadErr

      const { data: inserted, error: insertErr } = await supabase
        .from('backgrounds')
        .insert({
          name: usedBgPrompt ? usedBgPrompt.slice(0, 40) : 'Arkaplan',
          thumbnail_url: '',
          prompt: usedBgPrompt,
          owner_id: user.id,
          source: 'user',
          image_path: path,
        })
        .select('id,name,thumbnail_url,prompt,owner_id,image_path,source')
        .single()
      if (insertErr) throw insertErr

      const { data: signed } = await supabase.storage.from('backgrounds').createSignedUrl(path, 3600)
      const newBg: Background = { ...(inserted as Background), signedUrl: signed?.signedUrl }
      setBackgrounds((prev) => [newBg, ...prev])
      setSavedBgIndices((prev) => new Set(prev).add(index))
    } catch (e) {
      console.error(e)
      setBgSaveError(t('ecom.error.generic'))
    } finally {
      setSavingBgIndex(null)
    }
  }

  async function handleGenerate() {
    setShowConfirm(false)
    setGenError(null)
    setGenerating(true)
    setGenProgress({ done: 0, total: posesToRun.length })
    setSavedBgIndices(new Set())
    setBgSaveError(null)

    const backgroundForPrompt = backgrounds.find((b) => b.id === bgId)
    setUsedBgPrompt(customBgPrompt.trim() ? customBgPrompt.trim() : (backgroundForPrompt?.prompt ?? ''))

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

      let bgPrompt: string
      let backgroundRef: { base64: string; mimeType: string } | undefined
      if (customBgPrompt.trim()) {
        bgPrompt = customBgPrompt.trim()
        backgroundRef = undefined
      } else if (background) {
        bgPrompt = background.prompt ?? ''
        if (background.source === 'user' && (background.signedUrl || background.image_path)) {
          let url = background.signedUrl
          if (!url && background.image_path) {
            const { data: signed } = await supabase.storage.from('backgrounds').createSignedUrl(background.image_path, 3600)
            url = signed?.signedUrl
          }
          if (url) {
            const r = await urlToScaledBase64(url)
            backgroundRef = { base64: r.base64, mimeType: r.mimeType }
          }
        }
      } else {
        bgPrompt = ''
        backgroundRef = undefined
      }

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
            ...(backgroundRef ? { backgroundRef } : {}),
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

      // ---- ARKA: hero-aktarim; logolu yakin cekim ONCE (arka hero) ----
      if (backPoses.length > 0 && !stoppedInsufficient) {
        // logo net olsun diye close_up olan arka pozu HERO yap (detay referansini o alir)
        const orderedBack = [...backPoses].sort((a, b) =>
          (a.shot_type === 'close_up' ? -1 : 0) - (b.shot_type === 'close_up' ? -1 : 0)
        )
        const backHeroPose = orderedBack[0]
        let backHeroInput: { base64: string; mimeType: string } | null = null

        if (frontHeroInput) {
          const { data, error } = await supabase.functions.invoke('generate-pose', {
            body: { photo: frontHeroInput, poses: [backHeroPose], tuck: tuck ?? undefined, side: 'back', clothes: clothesPayload },
          })
          if (error) { await readErr(error) }
          else {
            const img = (data?.images as string[] | undefined)?.[0]
            if (img) { collectedImages.push(img); setGenProgress((p) => ({ ...p, done: p.done + 1 })); backHeroInput = await urlToScaledBase64(img) }
          }
        } else {
          const { data, error } = await supabase.functions.invoke('generate-ecom', {
            body: {
              clothes: clothesPayload, model, backgroundPrompt: bgPrompt,
              ...(backgroundRef ? { backgroundRef } : {}),
              poses: [backHeroPose], ratio, quality, tuck: tuck ?? undefined, side: 'back',
            },
          })
          if (error) { await readErr(error) }
          else {
            const img = (data?.images as string[] | undefined)?.[0]
            if (img) { collectedImages.push(img); setGenProgress((p) => ({ ...p, done: p.done + 1 })); backHeroInput = await urlToScaledBase64(img) }
          }
        }

        if (backHeroInput) {
          for (const pose of orderedBack.slice(1)) {
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
    setStepIndex(0); setClothes([]); setModelId(null); setBgId(null); setBgFilter('preset'); setCustomBgPrompt(''); setUsedBgPrompt(''); setSavedBgIndices(new Set())
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
        <p className="mb-1 text-[10px] font-medium text-content-primary">{label}</p>
        {preview ? (
          <div className="relative aspect-[3/4] overflow-hidden rounded-liora">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => clearSlot(c.id, angle, 'main')}
              aria-label="Kaldir"
              className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-pill bg-surface-overlay"
            >
              <X className="h-3 w-3 text-content-primary" />
            </button>
          </div>
        ) : (
          <UploadTile
            size="sm"
            onPickFile={() => openSlotFilePicker(c.id, angle, 'main')}
            onPickAsset={() => setSlotAssetPicker({ clothId: c.id, angle, kind: 'main' })}
          />
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
          <img src={preview} alt="" className="h-12 w-12 rounded-liora object-cover" />
          <button
            type="button"
            onClick={() => clearSlot(c.id, angle, 'detail')}
            aria-label="Kaldir"
            className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-pill bg-surface-overlay"
          >
            <X className="h-2.5 w-2.5 text-content-primary" />
          </button>
        </div>
        <p className="text-[9px] leading-snug text-content-secondary">{label}</p>
      </div>
    ) : (
      <div className="mt-2">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => openSlotFilePicker(c.id, angle, 'detail')}
            className="rounded-liora border border-border-default px-2 py-1 text-[10px] text-content-secondary transition hover:bg-surface-sunken hover:text-content-primary"
          >
            {label}
          </button>
          <button
            type="button"
            onClick={() => setSlotAssetPicker({ clothId: c.id, angle, kind: 'detail' })}
            className="rounded-liora border border-border-default px-2 py-1 text-[10px] text-content-secondary transition hover:bg-surface-sunken hover:text-content-primary"
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
        <div className="h-10 w-10 animate-spin rounded-pill border-2 border-border-default border-t-white" />
        <p className="text-sm text-content-secondary">{t('ecom.generating')}</p>
        <p className="text-sm text-content-secondary">{genProgress.done}/{genProgress.total}</p>
      </main>
    )
  }

  if (results) {
    const saveBgLabel = (i: number) =>
      savedBgIndices.has(i) ? t('ecom.bg.saved') : savingBgIndex === i ? t('ecom.generating') : t('ecom.bg.saveBtn')
    const saveBgDisabled = (i: number) => savedBgIndices.has(i) || savingBgIndex === i

    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium text-content-primary">{t('ecom.result.title')}</h1>
            <p className="mt-1 text-sm text-content-secondary">{t('ecom.result.subtitle')}</p>
          </div>
          <button
            onClick={resetFlow}
            className="rounded-liora border border-border-default px-4 py-2 text-sm text-content-primary transition hover:bg-surface-sunken"
          >
            {t('ecom.result.startOver')}
          </button>
        </div>

        <div className="mt-6">
          <ResultGrid
            images={results}
            onOpen={setLightbox}
            renderFooter={(src, i) => (
              <button
                type="button"
                onClick={() => handleSaveBackground(src, i)}
                disabled={saveBgDisabled(i)}
                className="w-full rounded-liora border border-border-default px-2 py-1.5 text-[10px] text-content-primary transition hover:bg-surface-sunken disabled:opacity-50"
              >
                {saveBgLabel(i)}
              </button>
            )}
          />
        </div>
        {bgSaveError && <p className="mt-3 text-sm text-state-danger">{bgSaveError}</p>}

        <Lightbox
          images={results}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={setLightbox}
          downloadBaseName="liora-ecom"
          footer={
            lightbox !== null && (
              <button
                type="button"
                onClick={() => handleSaveBackground(results[lightbox], lightbox)}
                disabled={saveBgDisabled(lightbox)}
                className="mt-3 rounded-liora border border-border-default px-5 py-2.5 text-sm text-content-primary transition hover:bg-surface-sunken disabled:opacity-50"
              >
                {saveBgLabel(lightbox)}
              </button>
            )
          }
        />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <p className="mb-4 text-xs text-content-secondary">{t('tool.ecom.title')}</p>

      <div className="mb-1.5 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-pill ${i <= stepIndex ? 'bg-action-primary' : 'bg-border-default'}`} />
        ))}
      </div>
      <div className="mb-8 flex justify-between text-[11px]">
        {STEPS.map((s, i) => (
          <span key={s} className={i === stepIndex ? 'font-medium text-content-primary' : 'text-content-muted'}>
            {t(`ecom.step.${s}` as TranslationKey)}
          </span>
        ))}
      </div>

      {step === 'clothes' && (
        <div>
          <p className="text-base font-medium text-content-primary">{t('ecom.clothes.title')}</p>
          <p className="mb-4 text-sm text-content-secondary">{t('ecom.clothes.subtitle')}</p>
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
              <div key={c.id} className="overflow-hidden rounded-liora border border-border-subtle bg-surface-raised p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] text-content-secondary">{t('ecom.clothes.title')}</span>
                  <button onClick={() => removeCloth(c.id)} aria-label="Kaldir" className="flex h-5 w-5 items-center justify-center rounded-pill bg-surface-overlay text-content-primary hover:text-content-primary">
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {!c.category && <p className="mb-1.5 text-[10px] text-accent-primary">{t('ecom.clothes.pickCategory')}</p>}
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((cat) => (
                    <button key={cat} onClick={() => setClothCategory(c.id, cat)} className={`rounded-pill px-2 py-0.5 text-[10px] transition ${c.category === cat ? 'bg-action-primary text-action-primary-fg' : 'border border-border-default text-content-secondary hover:text-content-primary'}`}>
                      {t(`ecom.cat.${cat}` as TranslationKey)}
                    </button>
                  ))}
                </div>

                <div className="mt-2.5">
                  {renderMainSlot(c, 'front')}
                  {!c.frontFile && !c.frontUrl && (
                    <p className="mt-1 text-[10px] text-accent-primary">{t('ecom.angle.front')}</p>
                  )}
                  {renderDetailSlot(c, 'front')}
                  {c.frontFile && (
                    <button
                      type="button"
                      onClick={() => handleSaveAsAsset(c.id)}
                      disabled={c.savedAsAsset}
                      className="mt-2 w-full rounded-liora border border-border-default px-2 py-1 text-[10px] text-content-secondary transition hover:bg-surface-sunken disabled:opacity-50"
                    >
                      {c.savedAsAsset ? t('assets.saved') : t('assets.saveAsAsset')}
                    </button>
                  )}
                </div>

                <div className="mt-2.5 border-t border-border-subtle pt-2.5">
                  {renderMainSlot(c, 'back')}
                  {renderDetailSlot(c, 'back')}
                  <p className="mt-1.5 text-[9px] leading-snug text-content-muted">{t('ecom.angle.backHint')}</p>
                </div>

                <div className="mt-2.5">
                  <label className="mb-1 block text-[10px] text-content-secondary">{t('ecom.stylingNotes.label')}</label>
                  <textarea
                    value={c.notes}
                    onChange={(e) => setClothNotes(c.id, e.target.value)}
                    placeholder={t('ecom.stylingNotes.placeholder')}
                    rows={2}
                    className="min-h-[60px] w-full rounded-liora border border-border-subtle bg-surface-raised p-2 text-xs text-content-primary outline-none transition placeholder:text-content-muted focus:border-border-focus"
                  />
                </div>
              </div>
            ))}
            {clothes.length < 6 && (
              <UploadTile
                onPickFile={() => fileInputRef.current?.click()}
                onPickAsset={() => setAssetPickerOpen(true)}
                caption={`${clothes.length} / 6`}
                isDragging={isDragging}
                dropHandlers={dropHandlers}
              />
            )}
          </div>
          <p className="mt-3 text-[11px] text-content-muted">{t('ecom.clothes.max')}</p>

          <div className="mt-6">
            <p className="text-xs text-content-secondary">{t('ecom.tuck.title')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTuck(tuck === 'out' ? null : 'out')}
                className={`rounded-liora border px-4 py-2 text-sm transition ${tuck === 'out' ? 'border-content-primary text-content-primary' : 'border-border-default text-content-secondary hover:text-content-primary'}`}
              >
                {t('ecom.tuck.out')}
              </button>
              <button
                type="button"
                onClick={() => setTuck(tuck === 'in' ? null : 'in')}
                className={`rounded-liora border px-4 py-2 text-sm transition ${tuck === 'in' ? 'border-content-primary text-content-primary' : 'border-border-default text-content-secondary hover:text-content-primary'}`}
              >
                {t('ecom.tuck.in')}
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'model' && (
        <div>
          <p className="text-base font-medium text-content-primary">{t('ecom.model.title')}</p>
          <p className="mb-4 text-sm text-content-secondary">{t('ecom.model.subtitle')}</p>
          {loadingData ? <p className="text-sm text-content-secondary">{t('ecom.loading')}</p> : (
            <>
              <ModelFilterTabs value={modelFilter} onChange={setModelFilter} className="mb-3" />
              {modelFilter === 'own' && (
                <p className="mb-3 text-xs text-content-secondary">{t('models.own.info')}</p>
              )}
              {modelFilter !== 'own' && models.length === 0 ? (
                <p className="text-sm text-content-secondary">{t('ecom.empty')}</p>
              ) : modelFilter !== 'own' && filteredModels.length === 0 ? (
                <p className="text-sm text-content-secondary">{t('ecom.empty')}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {modelFilter === 'own' && (
                    <button
                      type="button"
                      onClick={() => setModelUploadOpen(true)}
                      className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-liora border border-dashed border-border-default bg-surface-raised text-content-secondary transition hover:border-border-strong hover:text-content-secondary"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="mt-1 px-2 text-center text-[10px]">{t('models.upload.tile')}</span>
                    </button>
                  )}
                  {filteredModels.map((m) => (
                    <SelectCard
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
          <p className="text-base font-medium text-content-primary">{t('ecom.bg.title')}</p>
          <p className="mb-4 text-sm text-content-secondary">{t('ecom.bg.subtitle')}</p>
          <div className="mb-3 flex flex-wrap gap-1">
            {(['preset', 'saved'] as BackgroundFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setBgFilter(filter)}
                className={`rounded-pill px-3 py-1 text-xs transition ${
                  bgFilter === filter
                    ? 'bg-action-primary text-action-primary-fg'
                    : 'text-content-secondary hover:bg-surface-sunken hover:text-content-primary'
                }`}
              >
                {t(filter === 'preset' ? 'ecom.bg.tab.preset' : 'ecom.bg.tab.saved')}
              </button>
            ))}
          </div>
          {loadingData ? <p className="text-sm text-content-secondary">{t('ecom.loading')}</p> : filteredBackgrounds.length === 0 ? (
            <p className="text-sm text-content-secondary">{bgFilter === 'saved' ? t('ecom.bg.savedEmpty') : t('ecom.empty')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {filteredBackgrounds.map((b) => (
                <SelectCard
                  key={b.id}
                  selected={bgId === b.id}
                  onClick={() => selectBackground(b.id)}
                  name={b.name}
                  imageUrl={b.signedUrl ?? b.thumbnail_url}
                />
              ))}
            </div>
          )}
          <div className="mt-6 rounded-liora border border-border-subtle bg-surface-raised p-4">
            <p className="mb-3 text-sm font-medium text-content-primary">{t('ecom.bg.customTitle')}</p>
            <textarea
              value={customBgPrompt}
              onChange={(e) => handleCustomBgPromptChange(e.target.value)}
              placeholder={t('ecom.bg.customPlaceholder')}
              rows={4}
              className="min-h-[90px] w-full rounded-liora border border-border-subtle bg-surface-raised p-3 text-sm text-content-primary outline-none transition placeholder:text-content-muted focus:border-border-focus"
            />
            <p className="mt-2 text-xs text-content-secondary">{t('ecom.bg.customHint')}</p>
          </div>
        </div>
      )}

      {step === 'pose' && (
        <div>
          <p className="text-base font-medium text-content-primary">{t('ecom.pose.title')}</p>
          <p className="mb-4 text-sm text-content-secondary">{t('ecom.pose.subtitle')}</p>

          <p className="mb-2 text-sm font-medium text-content-primary">{t('poses.presetTitle')}</p>
          <PoseFilterTabs value={poseFilter} onChange={setPoseFilter} className="mb-3" />
          {loadingData ? <p className="text-sm text-content-secondary">{t('ecom.loading')}</p> : generalPoses.length === 0 ? <p className="text-sm text-content-secondary">{t('ecom.empty')}</p> : filteredPoses.length === 0 ? (
            <p className="text-sm text-content-secondary">{t('ecom.empty')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {filteredPoses.map((p) => (
                <SelectCard
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

          <div className="mt-6 rounded-liora border border-border-subtle bg-surface-raised p-4">
            <p className="mb-3 text-sm font-medium text-content-primary">{t('poses.customTitle')}</p>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addCustomPose() } }}
              placeholder={t('poses.customPlaceholder')}
              rows={4}
              className="min-h-[90px] w-full rounded-liora border border-border-subtle bg-surface-raised p-3 text-sm text-content-primary outline-none transition placeholder:text-content-muted focus:border-border-focus"
            />
            <button
              type="button"
              onClick={addCustomPose}
              disabled={!customInput.trim()}
              className="mt-2 rounded-liora border border-border-default px-4 py-1.5 text-sm text-content-primary transition hover:bg-surface-sunken disabled:opacity-40"
            >
              {t('poses.addBtn')}
            </button>
            {customPoses.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-content-secondary">{t('poses.customAdded')}</p>
                <div className="flex flex-wrap gap-2">
                  {customPoses.map((txt, i) => (
                    <span key={i} className="inline-flex max-w-full items-center gap-1.5 rounded-pill border border-border-default bg-surface-sunken px-2.5 py-1 text-xs text-content-primary">
                      <span className="truncate">{txt}</span>
                      <button type="button" onClick={() => removeCustomPose(i)} aria-label="Kaldir" className="shrink-0 text-content-secondary hover:text-content-primary">
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
          <p className="text-base font-medium text-content-primary">{t('ecom.size.title')}</p>
          <p className="mb-5 text-sm text-content-secondary">{t('ecom.size.subtitle')}</p>
          <p className="mb-2 text-xs text-content-secondary">{t('ecom.size.ratio')}</p>
          <div className="mb-6 flex flex-wrap gap-2">
            {ratios.map((r) => (
              <button key={r} onClick={() => setRatio(r)} className={`rounded-liora px-4 py-2 text-sm transition ${ratio === r ? 'bg-action-primary text-action-primary-fg' : 'border border-border-default text-content-primary hover:bg-surface-sunken'}`}>{r}</button>
            ))}
          </div>
          <p className="mb-2 text-xs text-content-secondary">{t('ecom.size.quality')}</p>
          <div className="flex flex-wrap gap-2">
            {qualities.map((q) => (
              <button key={q} onClick={() => setQuality(q)} className={`rounded-liora px-4 py-2 text-sm uppercase transition ${quality === q ? 'bg-action-primary text-action-primary-fg' : 'border border-border-default text-content-primary hover:bg-surface-sunken'}`}>{q}</button>
            ))}
          </div>
        </div>
      )}

      {genError && <p className="mt-6 text-sm text-state-danger">{genError}</p>}

      <div className="mt-8 flex items-center justify-between">
        <button onClick={handleBack} className="inline-flex items-center gap-1.5 rounded-liora border border-border-default px-4 py-2 text-sm text-content-primary hover:bg-surface-sunken">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>
        {step === 'size' ? (
          <button onClick={() => setShowConfirm(true)} className="rounded-liora bg-action-primary px-6 py-2 text-sm font-medium text-action-primary-fg">
            {t('ecom.generate')}
          </button>
        ) : (
          <button onClick={handleNext} disabled={!canContinue} className="inline-flex items-center gap-1.5 rounded-liora bg-action-primary px-5 py-2 text-sm font-medium text-action-primary-fg disabled:opacity-40">
            {t('common.continue')}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <CreditConfirmDialog
        open={showConfirm}
        credits={posesToRun.length}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleGenerate}
      />

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
