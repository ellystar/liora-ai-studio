'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, ArrowRight, ArrowLeft, Download, ChevronLeft, ChevronRight, Upload } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import type { TranslationKey } from '@/lib/i18n/dictionaries'
import { createClient } from '@/lib/supabase/client'
import { fileToScaledBase64 } from '@/lib/image/scale'
import { downloadAsJpg } from '@/lib/image/download'
import { useDropzone } from '@/lib/hooks/use-dropzone'

type Background = { id: string; name: string; thumbnail_url: string; prompt: string }
const STEPS = ['photo', 'bg'] as const

export default function FlatToGhostPage() {
  const router = useRouter()
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [backgrounds, setBackgrounds] = useState<Background[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [stepIndex, setStepIndex] = useState(0)
  const [photo, setPhoto] = useState<{ file: File; previewUrl: string } | null>(null)
  const [bgId, setBgId] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState<string[] | null>(null)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [genError, setGenError] = useState<string | null>(null)

  const step = STEPS[stepIndex]

  useEffect(() => {
    ;(async () => {
      const supabase = createClient()
      const { data } = await supabase.from('backgrounds').select('id,name,thumbnail_url,prompt').order('created_at', { ascending: false })
      setBackgrounds((data as Background[]) ?? [])
      setLoadingData(false)
    })()
  }, [])

  function selectPhoto(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setPhoto({ file, previewUrl: URL.createObjectURL(file) })
  }

  const { isDragging, dropHandlers } = useDropzone((files) => selectPhoto(files))

  const canContinue = step === 'photo' ? photo !== null : bgId !== null

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
      const { base64, mimeType } = await fileToScaledBase64(photo!.file)
      const selectedBackground = backgrounds.find((b) => b.id === bgId)
      const { data, error } = await supabase.functions.invoke('generate-ghost', {
        body: {
          photo: { base64, mimeType },
          backgroundPrompt: selectedBackground?.prompt ?? '',
        },
      })
      if (error) {
        let code = ''
        try { const ctx = await (error as { context: Response }).context.json(); code = ctx.error } catch {}
        setGenError(
          code === 'insufficient_credits' ? t('ecom.error.insufficient') :
          code === 'content_blocked' ? t('ecom.error.blocked') :
          code === 'model_busy' ? t('ecom.error.busy') :
          t('ecom.error.generic')
        )
        setGenerating(false)
        return
      }
      const img = (data?.images as string[] | undefined)?.[0]
      if (img) {
        setResults([img])
      } else {
        setGenError(t('ecom.error.generic'))
      }
      setGenerating(false)
      router.refresh()
    } catch {
      setGenError(t('ecom.error.generic'))
      setGenerating(false)
    }
  }

  function resetFlow() {
    setStepIndex(0); setPhoto(null); setBgId(null); setResults(null); setLightbox(null); setGenError(null)
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
            <button type="button" onClick={() => downloadAsJpg(results[lightbox], `liora-ghost-${lightbox + 1}`)} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-[#0a0a0a]">
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
      <p className="mb-4 text-xs text-neutral-500">{t('tool.flat.title')}</p>

      <div className="mb-1.5 flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-white' : 'bg-[#2a2a2a]'}`} />
        ))}
      </div>
      <div className="mb-8 flex justify-between text-[11px]">
        {STEPS.map((s, i) => (
          <span key={s} className={i === stepIndex ? 'font-medium text-neutral-100' : 'text-neutral-600'}>
            {t(`ghost.step.${s}` as TranslationKey)}
          </span>
        ))}
      </div>

      {step === 'photo' && (
        <div>
          <p className="text-base font-medium text-neutral-100">{t('ghost.upload.title')}</p>
          <p className="mb-4 text-sm text-neutral-500">{t('ghost.upload.subtitle')}</p>
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
            <button
              {...dropHandlers}
              onClick={() => fileInputRef.current?.click()}
              className={`flex h-64 w-full max-w-sm flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#333] text-neutral-500 transition hover:text-neutral-300${isDragging ? ' border-white bg-[#161616]' : ''}`}
            >
              <Upload className="h-7 w-7" />
              <span className="text-sm">{t('ghost.upload.title')}</span>
            </button>
          )}
        </div>
      )}

      {step === 'bg' && (
        <div>
          <p className="text-base font-medium text-neutral-100">{t('ecom.bg.title')}</p>
          <p className="mb-4 text-sm text-neutral-500">{t('ecom.bg.subtitle')}</p>
          {loadingData ? <p className="text-sm text-neutral-500">{t('ecom.loading')}</p> : backgrounds.length === 0 ? <p className="text-sm text-neutral-500">{t('ecom.empty')}</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {backgrounds.map((b) => {
                const selected = bgId === b.id
                return (
                  <button key={b.id} onClick={() => setBgId(b.id)} className={`relative overflow-hidden rounded-xl bg-[#141414] text-left transition ${selected ? 'border-[1.5px] border-white' : 'border border-[#242424] hover:border-[#2e2e2e]'}`}>
                    <div className="relative aspect-[3/4] bg-[#1c1c1c]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b.thumbnail_url} alt={b.name} className="h-full w-full object-cover" />
                      {selected && (
                        <span className="absolute right-1.5 top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white">
                          <Check className="h-3 w-3 text-[#0a0a0a]" />
                        </span>
                      )}
                    </div>
                    <div className="p-2"><p className="text-xs text-neutral-200">{b.name}</p></div>
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
        {step === 'bg' ? (
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
            <p className="mt-4 text-3xl font-medium text-white">1 <span className="text-base text-neutral-400">{t('nav.credits')}</span></p>
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
