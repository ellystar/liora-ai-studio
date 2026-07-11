'use client'

import { useI18n } from '@/lib/i18n/language-provider'

const PRIVACY_URL = 'https://lioralabs.io/gizlilik'

export function LegalConsentLine({ className }: { className?: string }) {
  const { t } = useI18n()
  const [before, after] = t('legal.consentLine').split('{link}')

  return (
    <p className={className}>
      {before}
      <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">
        {t('legal.privacyLink')}
      </a>
      {after}
    </p>
  )
}
