'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowUp, Download } from 'lucide-react'
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

async function scaledFromDataUrl(dataUrl: string) {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const file = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' })
  return fileToScaledBase64(file)
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const lastAssistantImage = [...messages].reverse().find((m) => m.role === 'assistant')?.images[0] ?? null
  const canSend = input.trim() !== '' && (attachments.length > 0 || lastAssistantImage !== null) && !sending

  function addFiles(files: FileList | null) {
    if (!files) return
    const incoming = Array.from(files).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
    setAttachments((prev) => [...prev, ...incoming].slice(0, 2))
  }
  function removeAttachment(i: number) {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i))
  }
  function addAssetAttachment(asset: Asset) {
    const signedUrl = asset.signedUrl
    if (attachments.length >= 2 || !signedUrl) return
    setAttachments((prev) => [...prev, { url: signedUrl, previewUrl: signedUrl }].slice(0, 2))
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
    <main className="mx-auto flex h-[calc(100vh-130px)] max-w-3xl flex-col px-4 py-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-neutral-500">{t('tool.edit.title')}</p>
        <p className="text-[11px] text-neutral-600">{t('edit.warning')}</p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && !sending ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-base font-medium text-neutral-200">{t('edit.empty.title')}</p>
            <p className="mt-2 max-w-sm text-sm text-neutral-500">{t('edit.empty.subtitle')}</p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${m.role === 'user' ? 'rounded-2xl rounded-br-sm bg-[#1f1f1f] px-4 py-2.5' : ''}`}>
                {m.text && <p className="text-sm text-neutral-200">{m.text}</p>}
                {m.images.length > 0 && (
                  <div className={`flex flex-wrap gap-2 ${m.text ? 'mt-2' : ''}`}>
                    {m.images.map((src, i) => (
                      <button key={i} onClick={() => m.role === 'assistant' && setLightbox(src)} className={m.role === 'assistant' ? 'overflow-hidden rounded-xl border border-[#242424]' : ''}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className={m.role === 'assistant' ? 'max-h-80 w-auto rounded-xl' : 'h-16 w-16 rounded-lg object-cover'} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
              {t('edit.thinking')}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500">{t('edit.ratio')}</span>
          {RATIOS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRatio(r)}
              className={`rounded px-3 py-1 text-xs bg-[#1c1c1c] transition ${ratio === r ? 'border border-white text-neutral-100' : 'border border-[#2a2a2a] text-neutral-400'}`}
            >
              {r === 'original' ? t('edit.ratioOriginal') : r}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-500">{t('edit.quality')}</span>
          {QUALITIES.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuality(q)}
              className={`rounded px-3 py-1 text-xs uppercase bg-[#1c1c1c] transition ${quality === q ? 'border border-white text-neutral-100' : 'border border-[#2a2a2a] text-neutral-400'}`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div {...dropHandlers} className={`mt-2 rounded-2xl border border-[#242424] bg-[#141414] p-2.5${isDragging ? ' border-white bg-[#161616]' : ''}`}>
        {attachments.length > 0 && (
          <div className="mb-2 flex gap-2">
            {attachments.map((a, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.previewUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <button onClick={() => removeAttachment(i)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80">
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
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        <div className="mb-2 flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={attachments.length >= 2}
            className="rounded-lg border border-[#2a2a2a] px-3 py-1 text-[11px] text-neutral-300 transition hover:bg-[#1c1c1c] disabled:opacity-40"
          >
            {t('assets.fromComputer')}
          </button>
          <button
            type="button"
            onClick={() => setAssetPickerOpen(true)}
            disabled={attachments.length >= 2}
            className="rounded-lg border border-[#2a2a2a] px-3 py-1 text-[11px] text-neutral-300 transition hover:bg-[#1c1c1c] disabled:opacity-40"
          >
            {t('assets.fromAssets')}
          </button>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            rows={1}
            placeholder={t('edit.placeholder')}
            className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
          />
          <button onClick={handleSend} disabled={!canSend} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#0a0a0a] disabled:opacity-30">
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-neutral-600">{t('edit.costNote')}</p>
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
          <button type="button" onClick={() => downloadAsJpg(lightbox, 'liora-edit-1')} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-[#0a0a0a]">
            <Download className="h-4 w-4" />
            {t('ecom.result.download')}
          </button>
        </div>
      )}
    </main>
  )
}
