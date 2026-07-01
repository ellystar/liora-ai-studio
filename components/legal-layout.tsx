'use client'

import Link from 'next/link'
import { useI18n } from '@/lib/i18n/language-provider'

type LegalLayoutProps = {
  title: string
  effectiveDate: string
  lastUpdated: string
  active: 'privacy' | 'terms'
  children: React.ReactNode
}

export function LegalLayout({ title, effectiveDate, lastUpdated, active, children }: LegalLayoutProps) {
  const { t, locale } = useI18n()
  const effectiveLabel = locale === 'tr' ? 'Yürürlük tarihi' : 'Effective date'
  const updatedLabel = locale === 'tr' ? 'Son güncelleme' : 'Last updated'

  return (
    <div className="legal-page">
      <div className="legal-shell">
        <header className="legal-topbar">
          <Link href="/login" className="legal-wordmark" lang="en">
            LIORA
          </Link>
          <Link href="/login" className="legal-back">
            ← {t('common.back')}
          </Link>
        </header>

        <main className="legal-main">
          <h1 className="legal-h1">{title}</h1>
          <p className="legal-meta">
            {effectiveLabel}: {effectiveDate}
            <br />
            {updatedLabel}: {lastUpdated}
          </p>
          <article className="legal-body">{children}</article>
        </main>

        <footer className="legal-footer">
          <nav className="legal-footer-links" aria-label="Legal">
            <Link href="/privacy" className={active === 'privacy' ? 'is-active' : undefined}>
              {t('login.privacy')}
            </Link>
            <span className="sep">|</span>
            <Link href="/terms" className={active === 'terms' ? 'is-active' : undefined}>
              {t('login.terms')}
            </Link>
          </nav>
        </footer>
      </div>
    </div>
  )
}

export function LegalH2({ children }: { children: React.ReactNode }) {
  return <h2 className="legal-h2">{children}</h2>
}

export function LegalP({ children }: { children: React.ReactNode }) {
  return <p className="legal-p">{children}</p>
}

export function LegalUl({ children }: { children: React.ReactNode }) {
  return <ul className="legal-ul">{children}</ul>
}

export function LegalLi({ children }: { children: React.ReactNode }) {
  return <li className="legal-li">{children}</li>
}

export function LegalEmail({ address = 'info@lioralabs.io' }: { address?: string }) {
  return (
    <a href={`mailto:${address}`} className="legal-link">
      {address}
    </a>
  )
}
