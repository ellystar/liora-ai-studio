'use client'

import { Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n/language-provider'
import type { TranslationKey } from '@/lib/i18n/dictionaries'

const PACKAGES = [
  { credits: 50, price: 50, popular: false },
  { credits: 100, price: 100, popular: true },
  { credits: 500, price: 500, popular: false },
]
const FEATURE_KEYS: TranslationKey[] = [
  'pricing.feat.ecom', 'pricing.feat.pose', 'pricing.feat.ghost',
  'pricing.feat.edit', 'pricing.feat.quality', 'pricing.feat.download',
]

export default function PricingPage() {
  const { t } = useI18n()
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-medium text-neutral-100">{t('pricing.title')}</h1>
        <p className="mt-2 text-sm text-neutral-500">{t('pricing.subtitle')}</p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {PACKAGES.map((pkg) => {
          const subject = encodeURIComponent(`Liora - ${pkg.credits} kredi paketi`)
          return (
            <div key={pkg.credits} className={`relative rounded-2xl border p-6 ${pkg.popular ? 'border-white bg-[#161616]' : 'border-[#242424] bg-[#141414]'}`}>
              {pkg.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-[11px] font-medium text-[#0a0a0a]">
                  {t('pricing.popular')}
                </span>
              )}
              <p className="text-3xl font-medium text-neutral-100">
                {pkg.credits} <span className="text-base text-neutral-400">{t('pricing.credits')}</span>
              </p>
              <p className="mt-1 text-sm text-neutral-500">{pkg.credits} {t('pricing.imagesSuffix')}</p>
              <p className="mt-5 text-2xl font-medium text-white">${pkg.price}</p>
              <a
                href={`mailto:info@lioralabs.io?subject=${subject}`}
                className={`mt-6 block rounded-lg py-2.5 text-center text-sm font-medium transition ${pkg.popular ? 'bg-white text-[#0a0a0a] hover:bg-neutral-200' : 'border border-[#2a2a2a] text-neutral-200 hover:bg-[#1a1a1a]'}`}
              >
                {t('pricing.cta')}
              </a>
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-center text-sm text-neutral-500">{t('pricing.contactNote')}</p>

      <div className="mt-12 rounded-2xl border border-[#242424] bg-[#141414] p-6">
        <p className="text-sm font-medium text-neutral-200">{t('pricing.featuresTitle')}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {FEATURE_KEYS.map((k) => (
            <div key={k} className="flex items-center gap-2.5 text-sm text-neutral-300">
              <Check className="h-4 w-4 text-neutral-400" />
              {t(k)}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
