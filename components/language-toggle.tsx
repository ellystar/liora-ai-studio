'use client'

import { useI18n } from '@/lib/i18n/language-provider'

export function LanguageToggle() {
  const { locale, setLanguage } = useI18n()

  return (
    <button
      onClick={() => setLanguage(locale === 'tr' ? 'en' : 'tr')}
      className="rounded-lg border border-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:bg-neutral-900"
    >
      {locale === 'tr' ? 'EN' : 'TR'}
    </button>
  )
}
