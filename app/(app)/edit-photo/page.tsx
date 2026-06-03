'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Paperclip, X, ArrowUp, Download } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import { createClient } from '@/lib/supabase/client'

type Msg = { id: string; role: 'user' | 'assistant'; text?: string; images: string[] }

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
function dataUrlToParts(dataUrl: string) {
  const [head, data] = dataUrl.split(',')
  const mime = head.match(/data:(.*?);/)?.[1] ?? 'image/png'
  return { base64: data, mimeType: mime }
}

export default function EditPhotoPage() {
  const router = useRouter()
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<{ file: File; previewUrl: string }[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)

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

  async function handleSend() {
    if (!canSend) return
    const instruction = input.trim()

    let apiImages: { base64: string; mimeType: string }[]
    if (attachments.length > 0) {
      apiImages = await Promise.all(
        attachments.map(async (a) => ({ base64: await fileToBase64(a.file), mimeType: a.file.type || 'image/png' })),
      )
    } else if (lastAssistantImage) {
      apiImages = [dataUrlToParts(lastAssistantImage)]
    } else {
      setError(t('edit.needPhoto'))
      return
    }

    const userPreviews = attachments.map((a) => a.previewUrl)
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text: instruction, images: userPreviews }])
    setInput('')
    setAttachments([])
    setError(null)
    setSending(true)

    try {
      const supabase = createClient()
      const { data, error: invokeErr } = await supabase.functions.invoke('generate-edit', {
        body: { images: apiImages, instruction },
      })
      if (invokeErr) {
        let code = ''
        try { const ctx = await (invokeErr as any).context.json(); code = ctx.error } catch {}
        setError(code === 'insufficient_credits' ? t('ecom.error.insufficient') : t('ecom.error.generic'))
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

      <div className="mt-3 rounded-2xl border border-[#242424] bg-[#141414] p-2.5">
        {attachments.length > 0 && (
          <div className="mb-2 flex gap-2">
            {attachments.map((a, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.previewUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <button onClick={() => removeAttachment(i)} className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/80">
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
        <div className="flex items-end gap-2">
          <button onClick={() => fileInputRef.current?.click()} disabled={attachments.length >= 2} title={t('edit.maxPhotos')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-[#1f1f1f] disabled:opacity-30">
            <Paperclip className="h-4 w-4" />
          </button>
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

      {lightbox && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-4">
          <button onClick={() => setLightbox(null)} aria-label="Kapat" className="absolute right-5 top-5 text-neutral-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-[75vh] w-auto rounded-xl" />
          <a href={lightbox} download="liora-edit.png" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-[#0a0a0a]">
            <Download className="h-4 w-4" />
            {t('ecom.result.download')}
          </a>
        </div>
      )}
    </main>
  )
}
