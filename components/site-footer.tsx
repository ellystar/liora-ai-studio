'use client'

import { useI18n } from '@/lib/i18n/language-provider'
import type { TranslationKey } from '@/lib/i18n/dictionaries'
import './site-footer.css'

const LEGAL_LINKS: { key: TranslationKey; href: string }[] = [
  { key: 'legal.footer.privacy', href: 'https://lioralabs.io/gizlilik' },
  { key: 'legal.footer.distanceSales', href: 'https://lioralabs.io/mesafeli-satis' },
  { key: 'legal.footer.deliveryReturns', href: 'https://lioralabs.io/iade-sartlari' },
]

type SiteFooterProps = {
  variant?: 'default' | 'compact'
  className?: string
}

export function SiteFooter({ variant = 'default', className }: SiteFooterProps) {
  const { t } = useI18n()

  return (
    <footer
      className={['site-footer', `site-footer--${variant}`, className].filter(Boolean).join(' ')}
    >
      <nav className="site-footer__links" aria-label="Legal">
        {LEGAL_LINKS.map((link, i) => (
          <span key={link.href} className="site-footer__link-item">
            {i > 0 && <span className="site-footer__sep" aria-hidden>·</span>}
            <a href={link.href} target="_blank" rel="noopener noreferrer">
              {t(link.key)}
            </a>
          </span>
        ))}
      </nav>
    </footer>
  )
}
