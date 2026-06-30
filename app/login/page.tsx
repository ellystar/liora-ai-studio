'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useI18n } from '@/lib/i18n/language-provider'
import './login.css'

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <line x1="4" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  )
}

function SubmitArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <line x1="4" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const { locale, setLanguage, t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      console.error('Supabase login error:', error)
      setError(`[${error.status ?? '?'}] ${error.message}`)
      setLoading(false)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="login-page">
      <div className="bg" aria-hidden />
      <div className="grain" aria-hidden />

      <div className="shell">
        <header className="topbar">
          <div className="wordmark rise d1">LIORA</div>
          <nav className="lang rise d1" role="group" aria-label="Language">
            <button
              type="button"
              className={locale === 'en' ? 'is-active' : undefined}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
            <span className="sep">|</span>
            <button
              type="button"
              className={locale === 'tr' ? 'is-active' : undefined}
              onClick={() => setLanguage('tr')}
            >
              TR
            </button>
          </nav>
        </header>

        <div className="middle">
          <div className="left">
            <div className="hero rise d2">
              <h1 dangerouslySetInnerHTML={{ __html: t('login.headline') }} />
              <p className="sublabel" dangerouslySetInnerHTML={{ __html: t('login.sublabel') }} />
            </div>

            <div className="exclusive rise d3">
              <div className="eyebrow">{t('login.exLabel')}</div>
              <p>{t('login.exBody')}</p>
              <a className="req" href="mailto:info@lioralabs.io">
                <span>{t('login.reqLink')}</span>
                <ArrowIcon />
              </a>
            </div>
          </div>

          <section className="card rise d3">
            <h2 className="welcome">{t('login.welcome')}</h2>
            <p className="welcome-sub">{t('login.welcomeSub')}</p>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="email">{t('login.emailLabel')}</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t('login.emailPh')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="password">{t('login.pwLabel')}</label>
                <div className="input-wrap">
                  <input
                    id="password"
                    className="pw"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder={t('login.pwPh')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="peek"
                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="row">
                <label className="check">
                  <input type="checkbox" />
                  <span className="box">
                    <CheckIcon />
                  </span>
                  <span>{t('login.remember')}</span>
                </label>
                <a className="forgot" href="#">
                  {t('login.forgot')}
                </a>
              </div>

              <button type="submit" className="submit" disabled={loading}>
                <span>{loading ? t('login.signingIn') : t('login.signin')}</span>
                <SubmitArrowIcon />
              </button>

              {error && (
                <p className="msg" role="status" aria-live="polite">
                  {error}
                </p>
              )}
            </form>

            <p className="no-account">{t('login.noAccount')}</p>
          </section>
        </div>

        <footer className="footer rise d5">
          <span>{t('login.scale')}</span>
          <span className="links">
            <a href="#">{t('login.privacy')}</a>
            <span className="sep">|</span>
            <a href="#">{t('login.terms')}</a>
          </span>
        </footer>
      </div>
    </div>
  )
}
