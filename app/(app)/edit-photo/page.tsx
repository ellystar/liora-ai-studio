'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUp, Download, Paperclip, SlidersHorizontal, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import { createClient } from '@/lib/supabase/client'
import { fileToScaledBase64, urlToScaledBase64 } from '@/lib/image/scale'
import { downloadAsJpg } from '@/lib/image/download'
import { useDropzone } from '@/lib/hooks/use-dropzone'
import { AssetPicker } from '@/components/asset-picker'
import { saveAsset, type Asset } from '@/lib/assets/assets'

type Msg = { id: string; role: 'user' | 'assistant'; text?: string; images: string[] }
type Attachment = {
  previewUrl: string
  file?: File
  url?: string
  saved?: boolean
}

const RATIOS = ['original', '1:1', '2:3', '3:4', '4:3'] as const
const QUALITIES = ['1k', '2k'] as const

const QUICK_KEYS = ['edit.quick.bg', 'edit.quick.color', 'edit.quick.remove'] as const

async function scaledFromDataUrl(dataUrl: string) {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const file = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' })
  return fileToScaledBase64(file)
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1 text-xs transition ${
        active
          ? 'border-violet-500/80 bg-violet-500/15 text-violet-200'
          : 'border-[#2a2a2a] bg-[#141414] text-neutral-400 hover:border-[#3a3a3a]'
      }`}
    >
      {children}
    </button>
  )
}

export default function EditPhotoPage() {
  const router = useRouter()
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [ratio, setRatio] = useState<'original' | '1:1' | '2:3' | '3:4' | '4:3'>('original')
  const [quality, setQuality] = useState<'1k' | '2k'>('1k')
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const lastAssistantImage = [...messages].reverse().find((m) => m.role === 'assistant')?.images[0] ?? null
  const canSend = input.trim() !== '' && (attachments.length > 0 || lastAssistantImage !== null) && !sending
  const isEmpty = messages.length === 0 && !sending

  function addFiles(files: FileList | null) {
    if (!files) return
    const incoming = Array.from(files).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
    setAttachments((prev) => [...prev, ...incoming].slice(0, 2))
    setAttachOpen(false)
  }
  function removeAttachment(i: number) {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i))
  }
  function addAssetAttachment(asset: Asset) {
    const signedUrl = asset.signedUrl
    if (attachments.length >= 2 || !signedUrl) return
    setAttachments((prev) => [...prev, { url: signedUrl, previewUrl: signedUrl }].slice(0, 2))
    setAttachOpen(false)
  }
  async function handleSaveAsAsset(i: number) {
    const a = attachments[i]
    if (!a?.file || a.saved) return
    try {
      await saveAsset(a.file)
      setAttachments((prev) => prev.map((item, idx) => (idx === i ? { ...item, saved: true } : item)))
    } catch (e) { console.error(e) }
  }

  const { isDragging, dropHandlers } = useDropzone((files) => addFiles(files))

  async function handleSend() {
    if (!canSend) return
    const message = input.trim()

    let images: { base64: string; mimeType: string }[]
    if (attachments.length > 0) {
      images = await Promise.all(
        attachments.map(async (a) =>
          a.file ? fileToScaledBase64(a.file) : urlToScaledBase64(a.url!)
        )
      )
    } else if (lastAssistantImage) {
      images = [await scaledFromDataUrl(lastAssistantImage)]
    } else {
      setError(t('edit.needPhoto'))
      return
    }

    const userPreviews = attachments.map((a) => a.previewUrl)
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text: message, images: userPreviews }])
    setInput('')
    setAttachments([])
    setError(null)
    setSending(true)

    try {
      const supabase = createClient()
      const { data, error: invokeErr } = await supabase.functions.invoke('generate-edit', {
        body: { images, message, ratio, quality },
      })
      if (invokeErr) {
        let code = ''
        try { const ctx = await (invokeErr as { context: Response }).context.json(); code = ctx.error } catch {}
        setError(
          code === 'insufficient_credits' ? t('ecom.error.insufficient') :
          code === 'content_blocked' ? t('ecom.error.blocked') :
          code === 'model_busy' ? t('ecom.error.busy') :
          t('ecom.error.generic')
        )
        setSending(false)
        return
      }
      const out = (data.images as string[])?.[0]
      if (out) {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', images: [out] }])
      } else {
        setError(t('ecom.error.generic'))
      }
      setSending(false)
      router.refresh()
    } catch {
      setError(t('ecom.error.generic'))
      setSending(false)
    }
  }

  return (
    <main className="flex h-[calc(100vh-130px)] flex-col">
      <div className="relative z-10 flex items-center justify-between px-5 py-3">
        <p className="text-xs text-neutral-500">{t('tool.edit.title')}</p>
        <p className="text-[11px] text-neutral-600">{t('edit.warning')}</p>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(85% 55% at 50% 42%, rgba(139,92,246,0.22), rgba(99,102,241,0.10) 45%, transparent 72%)',
          }}
        />

        <div className="relative z-10 mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col px-4 pb-5">
          {isEmpty ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
              <div className="edit-orb h-16 w-16 rounded-full" />
              <h2 className="mt-6 text-xl font-medium text-neutral-100">{t('edit.emptyTitle')}</h2>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {QUICK_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setInput(t(key))}
                    className="rounded-full border border-[#2a2a2a] bg-[#1c1c1c]/80 px-3.5 py-1.5 text-xs text-neutral-300 transition hover:border-violet-500/40 hover:text-violet-200"
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${m.role === 'user' ? 'rounded-2xl rounded-br-sm bg-[#1f1f1f] px-4 py-2.5' : ''}`}>
                {m.text && <p className="text-sm text-neutral-200">{m.text}</p>}
                {m.images.length > 0 && (
                  <div className={`flex flex-wrap gap-2 ${m.text ? 'mt-2' : ''}`}>
                    {m.images.map((src, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => m.role === 'assistant' && setLightbox(src)}
                        className={m.role === 'assistant' ? 'overflow-hidden rounded-xl border border-[#242424] ring-violet-500/0 transition hover:ring-violet-500/30' : ''}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt=""
                          className={m.role === 'assistant' ? 'max-h-80 w-auto rounded-xl' : 'h-16 w-16 rounded-lg object-cover'}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-900 border-t-violet-400" />
                {t('edit.thinking')}
              </div>
            </div>
          )}
        </div>
      )}

          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

          <div
            {...dropHandlers}
            className={`edit-prompt-bar relative mt-3 rounded-2xl border bg-[#1c1c1c]/90 p-3 backdrop-blur-sm transition ${
              isDragging ? 'border-violet-500/50' : 'border-[#2a2a2a]'
            }`}
          >
        {attachments.length > 0 && (
          <div className="mb-2 flex gap-2">
            {attachments.map((a, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.previewUrl} alt="" className="h-14 w-14 rounded-lg object-cover ring-1 ring-[#2a2a2a]" />
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
                {a.file && (
                  <button
                    type="button"
                    onClick={() => handleSaveAsAsset(i)}
                    disabled={a.saved}
                    className="absolute -bottom-1 left-0 right-0 rounded bg-black/70 px-0.5 py-0.5 text-[8px] text-neutral-300 disabled:opacity-50"
                  >
                    {a.saved ? t('assets.saved') : t('assets.saveAsAsset')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
        />

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          rows={1}
          placeholder={t('edit.placeholder')}
          className="max-h-32 w-full resize-none bg-transparent py-1.5 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-0"
        />

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => { setAttachOpen((v) => !v); setSettingsOpen(false) }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-neutral-400 transition hover:bg-[#242424] hover:text-neutral-200"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {t('edit.attach')}
              </button>
              {attachOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setAttachOpen(false)} />
                  <div className="absolute bottom-full left-0 z-30 mb-1 w-40 rounded-lg border border-[#2a2a2a] bg-[#141414] py-1 shadow-lg">
                    <button
                      type="button"
                      disabled={attachments.length >= 2}
                      onClick={() => fileInputRef.current?.click()}
                      className="block w-full px-3 py-1.5 text-left text-xs text-neutral-300 hover:bg-[#1c1c1c] disabled:opacity-40"
                    >
                      {t('assets.fromComputer')}
                    </button>
                    <button
                      type="button"
                      disabled={attachments.length >= 2}
                      onClick={() => { setAssetPickerOpen(true); setAttachOpen(false) }}
                      className="block w-full px-3 py-1.5 text-left text-xs text-neutral-300 hover:bg-[#1c1c1c] disabled:opacity-40"
                    >
                      {t('assets.fromAssets')}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => { setSettingsOpen((v) => !v); setAttachOpen(false) }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-neutral-400 transition hover:bg-[#242424] hover:text-neutral-200"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t('edit.settings')}
              </button>
              {settingsOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setSettingsOpen(false)} />
                  <div className="absolute bottom-full left-0 z-30 mb-1 w-64 rounded-xl border border-[#2a2a2a] bg-[#141414] p-3 shadow-lg">
                    <p className="mb-1.5 text-[10px] text-neutral-500">{t('edit.ratio')}</p>
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {RATIOS.map((r) => (
                        <Chip key={r} active={ratio === r} onClick={() => setRatio(r)}>
                          {r === 'original' ? t('edit.ratioOriginal') : r}
                        </Chip>
                      ))}
                    </div>
                    <p className="mb-1.5 text-[10px] text-neutral-500">{t('edit.quality')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUALITIES.map((q) => (
                        <Chip key={q} active={quality === q} onClick={() => setQuality(q)}>
                          {q.toUpperCase()}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="edit-send-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-lg shadow-violet-500/20 transition disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 px-0.5 text-[11px] text-neutral-600">{t('edit.costNote')}</p>
          </div>
        </div>
      </div>

      <AssetPicker
        open={assetPickerOpen}
        onClose={() => setAssetPickerOpen(false)}
        onSelect={addAssetAttachment}
      />

      {lightbox && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-4">
          <button onClick={() => setLightbox(null)} aria-label="Kapat" className="absolute right-5 top-5 text-neutral-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-[75vh] w-auto rounded-xl" />
          <button
            type="button"
            onClick={() => downloadAsJpg(lightbox, 'liora-edit-1')}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-[#0a0a0a]"
          >
            <Download className="h-4 w-4" />
            {t('ecom.result.download')}
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes editOrbPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 40px rgba(139, 92, 246, 0.45), 0 0 80px rgba(99, 102, 241, 0.2);
          }
          50% {
            transform: scale(1.04);
            box-shadow: 0 0 52px rgba(139, 92, 246, 0.58), 0 0 100px rgba(99, 102, 241, 0.3);
          }
        }
        .edit-orb {
          background: radial-gradient(circle at 35% 35%, #8b5cf6, #6366f1 55%, #3b82f6);
          animation: editOrbPulse 4s ease-in-out infinite;
        }
        .edit-prompt-bar:focus-within {
          border-color: rgba(139, 92, 246, 0.35);
          box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.2), 0 0 24px rgba(139, 92, 246, 0.12);
        }
        .edit-send-btn:not(:disabled):hover {
          box-shadow: 0 0 28px rgba(139, 92, 246, 0.45), 0 4px 16px rgba(99, 102, 241, 0.35);
          filter: brightness(1.08);
        }
      `}</style>
    </main>
  )
}
