'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { dictionaries, type Locale, type TranslationKey } from './dictionaries'

type LanguageContextType = {
  locale: Locale
  setLanguage: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale
  children: React.ReactNode
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale)

  const setLanguage = useCallback((next: Locale) => {
    setLocale(next)
    document.cookie = `locale=${next}; path=/; max-age=31536000`
  }, [])

  const t = useCallback(
    (key: TranslationKey) => dictionaries[locale][key] ?? key,
    [locale]
  )

  return (
    <LanguageContext.Provider value={{ locale, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider')
  return ctx
}
