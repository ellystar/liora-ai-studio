'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Plus, ArrowRight, ArrowLeft, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import type { TranslationKey } from '@/lib/i18n/dictionaries'
import { createClient } from '@/lib/supabase/client'
import { fileToScaledBase64, urlToScaledBase64 } from '@/lib/image/scale'
import { ratios, qualities, type Category, type Ratio, type Quality } from '@/lib/ecom/mock-data'

type Model = { id: string; name: string; gender: string | null; image_url: string; scope: string }
type Background = { id: string; name: string; thumbnail_url: string; prompt: string }
type Pose = { id: string; name: string; thumbnail_url: string; prompt: string }
type ClothItem = { id: string; file: File; previewUrl: string; category: Category | null }

const STEPS = ['clothes', 'model', 'background', 'pose', 'size'] as const
const CATEGORIES: Category[] = ['top', 'bottom', 'outerwear', 'onepiece', 'shoes', 'accessory']

function ItemCard({ selected, onClick, name, imageUrl, badge, multi }: {
  selected: boolean
  onClick: () => void
  name: string
  imageUrl: string
  badge?: { text: string; own?: boolean }
  multi?: boolean
}) {
  return (
    <button
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
        {badge && (
          <span className={`mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] ${badge.own ? 'bg-[#1f3a2c] text-[#7fd6a8]' : 'bg-[#262626] text-neutral-400'}`}>{badge.text}</span>
        )}
      </div>
    </button>
  )
}

export default function EcomStudioPage() {
  const router = useRouter()
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [models, setModels] = useState<Model[]>([])
  const [backgrounds, setBackgrounds] = useState<Background[]>([])
  const [poses, setPoses] = useState<Pose[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [stepIndex, setStepIndex] = useState(0)
  const [clothes, setClothes] = useState<ClothItem[]>([])
  const [modelId, setModelId] = useState<string | null>(null)
  const [bgId, setBgId] = useState<string | null>(null)
  const [poseIds, setPoseIds] = useState<string[]>([])
  const [ratio, setRatio] = useState<Ratio>('2:3')
  const [quality, setQuality] = useState<Quality>('1k')
  const [showConfirm, setShowConfirm] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<string[] | null>(null)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [genError, setGenError] = useState<string | null>(null)
  const [genProgress, setGenProgress] = useState({ done: 0, total: 0 })

  const step = STEPS[stepIndex]

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

  function addFiles(files: FileList | null) {
    if (!files) return
    const remaining = 6 - clothes.length
    const toAdd = Array.from(files).slice(0, remaining).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      category: null as Category | null,
    }))
    setClothes((prev) => [...prev, ...toAdd])
  }
  function removeCloth(id: string) {
    setClothes((prev) => prev.filter((c) => c.id !== id))
  }
  function setClothCategory(id: string, category: Category) {
    setClothes((prev) => prev.map((c) => (c.id === id ? { ...c, category } : c)))
  }
  function togglePose(id: string) {
    setPoseIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  const canContinue =
    step === 'clothes' ? clothes.length > 0 && clothes.every((c) => c.category) :
    step === 'model' ? modelId !== null :
    step === 'background' ? bgId !== null :
    step === 'pose' ? poseIds.length > 0 :
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

    const selectedPoses = poses.filter((p) => poseIds.includes(p.id)).map((p) => ({ id: p.id, prompt: p.prompt }))
    setGenProgress({ done: 0, total: selectedPoses.length })

    let stoppedInsufficient = false
    const collectedImages: string[] = []

    try {
      const supabase = createClient()
      const clothesPayload = await Promise.all(
        clothes.map(async (item) => {
          const { base64, mimeType } = await fileToScaledBase64(item.file)
          return { base64, mimeType, category: item.category }
        })
      )
      const selectedModel = models.find((m) => m.id === modelId)
      const background = backgrounds.find((b) => b.id === bgId)
      const model = await urlToScaledBase64(selectedModel!.image_url)

      for (const pose of selectedPoses) {
        const { data, error } = await supabase.functions.invoke('generate-ecom', {
          body: {
            clothes: clothesPayload,
            model,
            backgroundPrompt: background?.prompt ?? '',
            poses: [pose],
            ratio,
            quality,
          },
        })

        if (error) {
          let code = ''
          try { const ctx = await (error as { context: Response }).context.json(); code = ctx.error } catch {}
          if (code === 'insufficient_credits') {
            stoppedInsufficient = true
            break
          }
          setGenProgress((p) => ({ ...p, done: p.done + 1 }))
          continue
        }

        const img = (data?.images as string[] | undefined)?.[0]
        if (img) collectedImages.push(img)
        setGenProgress((p) => ({ ...p, done: p.done + 1 }))
      }

      setGenerating(false)
      router.refresh()

      if (collectedImages.length > 0) {
        setResults(collectedImages)
      } else {
        setGenError(stoppedInsufficient ? t('ecom.error.insufficient') : t('ecom.error.blocked'))
      }
    } catch {
      setGenError(t('ecom.error.generic'))
      setGenerating(false)
    }
  }

  function resetFlow() {
    setStepIndex(0); setClothes([]); setModelId(null); setBgId(null)
    setPoseIds([]); setRatio('2:3'); setQuality('1k'); setResults(null); setLightbox(null); setGenError(null)
    setGenProgress({ done: 0, total: 0 })
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
            <a href={results[lightbox]} download={`liora-${lightbox + 1}.png`} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-[#0a0a0a]">
              <Download className="h-4 w-4" />
              {t('ecom.result.download')}
            </a>
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {clothes.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-xl border border-[#242424] bg-[#141414]">
                <div className="relative aspect-[3/4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.previewUrl} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => removeCloth(c.id)} aria-label="Kaldir" className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70">
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
                <div className="p-2">
                  {!c.category && <p className="mb-1.5 text-[10px] text-amber-400">{t('ecom.clothes.pickCategory')}</p>}
                  <div className="flex flex-wrap gap-1">
                    {CATEGORIES.map((cat) => (
                      <button key={cat} onClick={() => setClothCategory(c.id, cat)} className={`rounded-full px-2 py-0.5 text-[10px] transition ${c.category === cat ? 'bg-white text-[#0a0a0a]' : 'border border-[#2a2a2a] text-neutral-400 hover:text-neutral-200'}`}>
                        {t(`ecom.cat.${cat}` as TranslationKey)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {clothes.length < 6 && (
              <button onClick={() => fileInputRef.current?.click()} className="flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#333] text-neutral-500 transition hover:text-neutral-300">
                <Plus className="h-6 w-6" />
                <span className="text-xs">{t('ecom.clothes.add')}</span>
                <span className="text-[10px] text-neutral-600">{clothes.length} / 6</span>
              </button>
            )}
          </div>
          <p className="mt-3 text-[11px] text-neutral-600">{t('ecom.clothes.max')}</p>
        </div>
      )}

      {step === 'model' && (
        <div>
          <p className="text-base font-medium text-neutral-100">{t('ecom.model.title')}</p>
          <p className="mb-4 text-sm text-neutral-500">{t('ecom.model.subtitle')}</p>
          {loadingData ? <p className="text-sm text-neutral-500">{t('ecom.loading')}</p> : models.length === 0 ? <p className="text-sm text-neutral-500">{t('ecom.empty')}</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {models.map((m) => (
                <ItemCard key={m.id} selected={modelId === m.id} onClick={() => setModelId(m.id)} name={m.name} imageUrl={m.image_url} badge={{ text: m.scope, own: m.scope === 'own' }} />
              ))}
            </div>
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
          {loadingData ? <p className="text-sm text-neutral-500">{t('ecom.loading')}</p> : poses.length === 0 ? <p className="text-sm text-neutral-500">{t('ecom.empty')}</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {poses.map((p) => (
                <ItemCard key={p.id} selected={poseIds.includes(p.id)} onClick={() => togglePose(p.id)} name={p.name} imageUrl={p.thumbnail_url} multi />
              ))}
            </div>
          )}
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
            <p className="mt-4 text-3xl font-medium text-white">{poseIds.length} <span className="text-base text-neutral-400">{t('nav.credits')}</span></p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 rounded-lg border border-[#2a2a2a] py-2.5 text-sm text-neutral-300">{t('ecom.confirm.cancel')}</button>
              <button onClick={handleGenerate} className="flex-1 rounded-lg bg-white py-2.5 text-sm font-medium text-[#0a0a0a]">{t('ecom.confirm.confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
