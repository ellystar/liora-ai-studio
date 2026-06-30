'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Maximize2, Upload, Video, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import { createClient } from '@/lib/supabase/client'
import { fileToScaledBase64 } from '@/lib/image/scale'
import { useDropzone } from '@/lib/hooks/use-dropzone'

type FrameImage = { file: File; previewUrl: string }
type Status = 'idle' | 'loading' | 'done'
type Duration = 5 | 10
type Resolution = '720p' | '1080p'

function videoCost(duration: Duration, resolution: Resolution): number {
  if (resolution === '720p') return duration === 5 ? 3 : 4
  return duration === 5 ? 4 : 5
}

function FrameUpload({
  label,
  frame,
  onSelect,
  onClear,
  inputId,
}: {
  label: string
  frame: FrameImage | null
  onSelect: (files: FileList) => void
  onClear: () => void
  inputId: string
}) {
  const { isDragging, dropHandlers } = useDropzone(onSelect)

  return (
    <div className="min-w-0">
      <p className="mb-1 truncate text-[11px] text-neutral-400">{label}</p>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          if (e.target.files) onSelect(e.target.files)
          e.target.value = ''
        }}
      />
      {frame ? (
        <div className="relative h-24 overflow-hidden rounded-lg border border-[#242424] bg-[#141414]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={frame.previewUrl} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            aria-label="Remove"
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black/90"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          {...dropHandlers}
          className={`flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#333] bg-[#141414] p-2 text-neutral-500 transition hover:border-[#444] hover:text-neutral-400 ${isDragging ? 'border-white bg-[#161616]' : ''}`}
        >
          <Upload className="h-4 w-4" />
          <span className="text-[10px]">PNG, JPG</span>
        </label>
      )}
    </div>
  )
}

export default function VideoStudioPage() {
  const { t } = useI18n()
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollCancelledRef = useRef(false)

  const [firstFrame, setFirstFrame] = useState<FrameImage | null>(null)
  const [lastFrame, setLastFrame] = useState<FrameImage | null>(null)
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState<Duration>(5)
  const [resolution, setResolution] = useState<Resolution>('720p')
  const [status, setStatus] = useState<Status>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState(false)

  const cost = videoCost(duration, resolution)

  useEffect(() => {
    return () => {
      pollCancelledRef.current = true
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [])

  function stopPolling() {
    pollCancelledRef.current = true
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }

  function selectFirstFrame(files: FileList) {
    const file = files[0]
    if (!file) return
    setFirstFrame({ file, previewUrl: URL.createObjectURL(file) })
  }

  function selectLastFrame(files: FileList) {
    const file = files[0]
    if (!file) return
    setLastFrame({ file, previewUrl: URL.createObjectURL(file) })
  }

  async function pollJob(jobId: string) {
    const supabase = createClient()
    let attempts = 0

    const tick = async () => {
      if (pollCancelledRef.current) return

      if (attempts >= 60) {
        setError(t('video.error.timeout'))
        setStatus('idle')
        return
      }
      attempts++

      try {
        const { data, error: pollError } = await supabase.functions.invoke('generate-video-status', {
          body: { jobId },
        })

        if (pollCancelledRef.current) return

        if (pollError) {
          setError(t('video.error.generic'))
          setStatus('idle')
          return
        }

        if (data?.status === 'succeeded' && data.url) {
          setVideoUrl(data.url as string)
          setStatus('done')
          return
        }

        if (data?.status === 'failed') {
          setError(t('video.error.failed'))
          setStatus('idle')
          return
        }

        pollTimerRef.current = setTimeout(tick, 5000)
      } catch {
        if (!pollCancelledRef.current) {
          setError(t('video.error.generic'))
          setStatus('idle')
        }
      }
    }

    await tick()
  }

  async function handleGenerate() {
    if (!firstFrame) return

    stopPolling()
    pollCancelledRef.current = false
    setError(null)
    setVideoUrl(null)
    setStatus('loading')

    try {
      const supabase = createClient()
      const first = await fileToScaledBase64(firstFrame.file)
      const last = lastFrame ? await fileToScaledBase64(lastFrame.file) : undefined

      const { data, error: submitError } = await supabase.functions.invoke('generate-video-submit', {
        body: {
          firstFrame: first,
          lastFrame: last,
          prompt,
          resolution,
          duration,
        },
      })

      if (pollCancelledRef.current) return

      if (submitError) {
        let code = ''
        try {
          const ctx = await (submitError as { context: Response }).context.json()
          code = ctx.error
        } catch { /* ignore */ }
        setError(code === 'insufficient_credits' ? t('video.error.insufficient') : t('video.error.generic'))
        setStatus('idle')
        return
      }

      const jobId = data?.jobId as string | undefined
      if (!jobId) {
        setError(t('video.error.generic'))
        setStatus('idle')
        return
      }

      await pollJob(jobId)
    } catch {
      if (!pollCancelledRef.current) {
        setError(t('video.error.generic'))
        setStatus('idle')
      }
    }
  }

  function handleDownload() {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = 'liora-video.mp4'
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <>
      <main className="flex h-[calc(100vh-64px)] w-full overflow-hidden">
        <aside className="flex min-h-0 w-[340px] shrink-0 flex-col gap-3 border-r border-[#242424] px-5 py-5">
          <p className="text-xs text-neutral-500">{t('tool.video.title')}</p>

          <div className="grid grid-cols-2 gap-2.5">
            <FrameUpload
              label={t('video.firstFrame')}
              frame={firstFrame}
              onSelect={selectFirstFrame}
              onClear={() => setFirstFrame(null)}
              inputId="video-first-frame"
            />
            <FrameUpload
              label={t('video.lastFrame')}
              frame={lastFrame}
              onSelect={selectLastFrame}
              onClear={() => setLastFrame(null)}
              inputId="video-last-frame"
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <label htmlFor="video-prompt" className="mb-1 block text-[11px] text-neutral-400">
              {t('video.prompt')}
            </label>
            <textarea
              id="video-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[140px] w-full flex-1 resize-none rounded-lg border border-[#242424] bg-[#141414] px-3 py-2 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-[#3a3a3a]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-[11px] text-neutral-400">{t('video.duration')}</p>
              <div className="flex gap-1.5">
                {([5, 10] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`flex-1 rounded-lg py-1.5 text-xs transition ${duration === d ? 'bg-white text-[#0a0a0a]' : 'border border-[#2a2a2a] text-neutral-300 hover:bg-[#161616]'}`}
                  >
                    {d}s
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[11px] text-neutral-400">{t('video.quality')}</p>
              <div className="flex gap-1.5">
                {(['720p', '1080p'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setResolution(r)}
                    className={`flex-1 rounded-lg py-1.5 text-xs transition ${resolution === r ? 'bg-white text-[#0a0a0a]' : 'border border-[#2a2a2a] text-neutral-300 hover:bg-[#161616]'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!firstFrame}
            className="mt-auto w-full rounded-lg bg-white py-2 text-sm font-medium text-[#0a0a0a] transition hover:bg-neutral-200 disabled:opacity-40"
          >
            {t('video.generateBase')} ({cost} {t('nav.credits')})
          </button>
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col p-5">
          <div className="flex h-full min-h-0 flex-col rounded-2xl border border-[#242424] bg-[#141414] p-4">
            {status === 'idle' && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-neutral-500">
                <Video className="h-10 w-10 opacity-40" />
                <p className="text-sm">{t('video.previewEmpty')}</p>
              </div>
            )}

            {status === 'loading' && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-neutral-400" />
                <p className="text-sm text-neutral-400">{t('video.loading')}</p>
              </div>
            )}

            {status === 'done' && videoUrl && (
              <div className="flex min-h-0 flex-1 flex-col">
                <video
                  controls
                  src={videoUrl}
                  className="max-h-full min-h-0 w-full flex-1 rounded-xl bg-black object-contain"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setLightbox(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a2a] px-3 py-1.5 text-sm text-neutral-200 hover:bg-[#1c1c1c]"
                  >
                    <Maximize2 className="h-4 w-4" />
                    {t('video.expand')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-[#0a0a0a]"
                  >
                    {t('video.download')}
                  </button>
                </div>
                <p className="mt-3 text-xs text-neutral-500">{t('video.notSaved')}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {lightbox && videoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="Close"
            className="absolute right-5 top-5 text-neutral-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          <video
            controls
            autoPlay
            src={videoUrl}
            className="max-h-[90vh] max-w-full rounded-xl"
          />
        </div>
      )}
    </>
  )
}
