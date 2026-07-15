'use client'

import { useI18n } from '@/lib/i18n/language-provider'

export function LanguageToggle() {
  const { locale, setLanguage } = useI18n()

  return (
    <button
      onClick={() => setLanguage(locale === 'tr' ? 'en' : 'tr')}
      className="rounded-full border border-[#26231E] bg-transparent px-2.5 py-1 text-[11px] font-medium tracking-wide text-[#8F8A80] transition hover:border-[#3a3530] hover:text-[#EDE8DF]"
    >
      {locale === 'tr' ? 'EN' : 'TR'}
    </button>
  )
}
