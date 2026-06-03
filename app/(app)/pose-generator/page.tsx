'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, ArrowRight, ArrowLeft, Download, ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import type { TranslationKey } from '@/lib/i18n/dictionaries'
import { createClient } from '@/lib/supabase/client'

type Pose = { id: string; name: string; thumbnail_url: string; prompt: string }
const STEPS = ['photo', 'pose'] as const

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function PoseGeneratorPage() {
  const router = useRouter()
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [poses, setPoses] = useState<Pose[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [stepIndex, setStepIndex] = useState(0)
  const [photo, setPhoto] = useState<{ file: File; previewUrl: string } | null>(null)
  const [poseIds, setPoseIds] = useState<string[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<string[] | null>(null)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [genError, setGenError] = useState<string | null>(null)

  const step = STEPS[stepIndex]

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase.from('poses').select('id,name,thumbnail_url,prompt').order('created_at', { ascending: false })
      setPoses((data as Pose[]) ?? [])
      setLoadingData(false)
    })()
  }, [])

  function selectPhoto(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setPhoto({ file, previewUrl: URL.createObjectURL(file) })
  }
  function togglePose(id: string) {
    setPoseIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  const canContinue = step === 'photo' ? photo !== null : poseIds.length > 0

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
    try {
      const supabase = createClient()
      const base64 = await fileToBase64(photo!.file)
      const selectedPoses = poses.filter((p) => poseIds.includes(p.id)).map((p) => ({ id: p.id, prompt: p.prompt }))
      const { data, error } = await supabase.functions.invoke('generate-pose', {
        body: { photo: { base64, mimeType: photo!.file.type || 'image/png' }, poses: selectedPoses },
      })
      if (error) {
        let code = ''
        try { const ctx = await (error as any).context.json(); code = ctx.error } catch {}
        setGenError(code === 'insufficient_credits' ? t('ecom.error.insufficient') : t('ecom.error.generic'))
        setGenerating(false)
        return
      }
      setResults((data.images as string[]) ?? [])
      setGenerating(false)
      router.refresh()
    } catch {
      setGenError(t('ecom.error.generic'))
      setGenerating(false)
    }
  }

  function resetFlow() {
    setStepIndex(0); setPhoto(null); setPoseIds([]); setResults(null); setLightbox(null); setGenError(null)
  }

  if (generating) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
        <p className="text-sm text-neutral-400">{t('ecom.generating')}</p>
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
            <a href={results[lightbox]} download={`liora-pose-${lightbox + 1}.png`} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-[#0a0a0a]">
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
      <p className="mb-4 text-xs text-neutral-500">{t('tool.pose.title')}</p>

      <div className="mb-1.5 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-white' : 'bg-[#2a2a2a]'}`} />
        ))}
      </div>
      <div className="mb-8 flex justify-between text-[11px]">
        {STEPS.map((s, i) => (
          <span key={s} className={i === stepIndex ? 'font-medium text-neutral-100' : 'text-neutral-600'}>
            {t(`pose.step.${s}` as TranslationKey)}
          </span>
        ))}
      </div>

      {step === 'photo' && (
        <div>
          <p className="text-base font-medium text-neutral-100">{t('pose.upload.title')}</p>
          <p className="mb-4 text-sm text-neutral-500">{t('pose.upload.subtitle')}</p>
          <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(e) => { selectPhoto(e.target.files); e.target.value = '' }} />
          {photo ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.previewUrl} alt="" className="max-h-96 rounded-xl border border-[#242424]" />
              <button onClick={() => setPhoto(null)} aria-label="Kaldir" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70">
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="flex h-64 w-full max-w-sm flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#333] text-neutral-500 transition hover:text-neutral-300">
              <Upload className="h-7 w-7" />
              <span className="text-sm">{t('pose.upload.title')}</span>
            </button>
          )}
        </div>
      )}

      {step === 'pose' && (
        <div>
          <p className="text-base font-medium text-neutral-100">{t('ecom.pose.title')}</p>
          <p className="mb-4 text-sm text-neutral-500">{t('ecom.pose.subtitle')}</p>
          {loadingData ? <p className="text-sm text-neutral-500">{t('ecom.loading')}</p> : poses.length === 0 ? <p className="text-sm text-neutral-500">{t('ecom.empty')}</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {poses.map((p) => {
                const selected = poseIds.includes(p.id)
                return (
                  <button key={p.id} onClick={() => togglePose(p.id)} className={`relative overflow-hidden rounded-xl bg-[#141414] text-left transition ${selected ? 'border-[1.5px] border-white' : 'border border-[#242424] hover:border-[#2e2e2e]'}`}>
                    <div className="relative aspect-[3/4] bg-[#1c1c1c]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.thumbnail_url} alt={p.name} className="h-full w-full object-cover" />
                      {selected && (
                        <span className="absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded bg-white">
                          <Check className="h-3 w-3 text-[#0a0a0a]" />
                        </span>
                      )}
                    </div>
                    <div className="p-2"><p className="text-xs text-neutral-200">{p.name}</p></div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {genError && <p className="mt-6 text-sm text-red-400">{genError}</p>}

      <div className="mt-8 flex items-center justify-between">
        <button onClick={handleBack} className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a2a2a] px-4 py-2 text-sm text-neutral-300 hover:bg-[#161616]">
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>
        {step === 'pose' ? (
          <button onClick={() => setShowConfirm(true)} disabled={!canContinue} className="rounded-lg bg-white px-6 py-2 text-sm font-medium text-[#0a0a0a] disabled:opacity-40">
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
