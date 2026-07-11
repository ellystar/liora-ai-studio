'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LegalConsentLine } from '@/components/legal-consent-line'
import { useI18n } from '@/lib/i18n/language-provider'
import './request-access-modal.css'

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

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

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

  const canSubmit = name.trim() !== '' && email.trim() !== '' && message.trim() !== '' && !sending

  return (
    <div className="request-access-modal" role="dialog" aria-modal="true" aria-labelledby="ram-title">
      <div className="ram-overlay" onClick={onClose} aria-hidden />
      <div className="ram-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ram-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="ram-grid">
          <div className="ram-intro">
            <h2 id="ram-title" className="ram-title">
              {t('access.titleLine1')}
              <br />
              {t('access.titleLine2')}
            </h2>
            <p className="ram-subtitle">{t('access.subtitle')}</p>
            <p className="ram-direct">
              {t('access.direct')}{' '}
              <a href="mailto:info@lioralabs.io">info@lioralabs.io</a>
            </p>
          </div>

          <div className="ram-form-col">
            {sent ? (
              <p className="ram-sent">{t('access.sent')}</p>
            ) : (
              <form className="ram-form" onSubmit={handleSubmit}>
                <div className="ram-field">
                  <label htmlFor="ram-name">
                    {t('access.labelName')}
                    <span className="ram-req"> *</span>
                  </label>
                  <input
                    id="ram-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('access.namePh')}
                    required
                    autoComplete="name"
                  />
                </div>

                <div className="ram-field">
                  <label htmlFor="ram-email">
                    {t('access.labelEmail')}
                    <span className="ram-req"> *</span>
                  </label>
                  <input
                    id="ram-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('access.emailPh')}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="ram-field">
                  <label htmlFor="ram-message">
                    {t('access.labelMessage')}
                    <span className="ram-req"> *</span>
                  </label>
                  <textarea
                    id="ram-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('access.messagePh')}
                    required
                    rows={5}
                  />
                </div>

                <button type="submit" className="ram-submit" disabled={!canSubmit}>
                  {sending ? t('access.sending') : t('access.submit')}
                </button>

                <LegalConsentLine className="ram-consent" />

                {error && (
                  <p className="ram-error" role="status" aria-live="polite">
                    {error}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
