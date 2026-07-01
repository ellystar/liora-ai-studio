'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/language-provider'

export function RequestAccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) return
    setName('')
    setEmail('')
    setMessage('')
    setSending(false)
    setSent(false)
    setError(null)
  }, [open])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) return

    setSending(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: invokeError } = await supabase.functions.invoke('request-access', {
        body: { name: name.trim(), email: email.trim(), message: message.trim() },
      })

      if (invokeError || data?.error) {
        setError(t('access.error'))
        setSending(false)
        return
      }

      if (data?.ok) {
        setSent(true)
        setSending(false)
        return
      }

      setError(t('access.error'))
      setSending(false)
    } catch {
      setError(t('access.error'))
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-[#242424] bg-[#141414] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-100">{t('login.reqLink')}</h3>
          <button type="button" onClick={onClose} className="text-neutral-400 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {sent ? (
          <p className="text-sm text-neutral-300">{t('access.sent')}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('access.namePh')}
              required
              className="w-full rounded-lg border border-[#242424] bg-[#141414] px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-[#3a3a3a]"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login.emailPh')}
              required
              className="w-full rounded-lg border border-[#242424] bg-[#141414] px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-[#3a3a3a]"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('access.messagePh')}
              required
              rows={4}
              className="min-h-[96px] w-full resize-none rounded-lg border border-[#242424] bg-[#141414] px-3 py-2 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-[#3a3a3a]"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={sending || !name.trim() || !email.trim() || !message.trim()}
              className="w-full rounded-lg bg-white py-2.5 text-sm font-medium text-[#0a0a0a] disabled:opacity-40"
            >
              {sending ? t('access.sending') : t('login.reqLink')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
