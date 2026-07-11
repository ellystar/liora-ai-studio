'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { CheckoutModal, type CheckoutPackage } from '@/components/checkout-modal'
import { SiteFooter } from '@/components/site-footer'
import { useI18n } from '@/lib/i18n/language-provider'
import type { TranslationKey } from '@/lib/i18n/dictionaries'

type Package = CheckoutPackage

const PACKAGES: Package[] = [
  { id: 'free', nameKey: 'pricing.pkg.free', credits: 3, priceUsd: null, kind: 'free', featureKeys: [] },
  { id: 'starter', nameKey: 'pricing.pkg.starter', credits: 50, priceUsd: 60, kind: 'paid', featureKeys: [] },
  { id: 'studio', nameKey: 'pricing.pkg.studio', credits: 150, priceUsd: 180, kind: 'paid', popular: true, featureKeys: [] },
  { id: 'atelier', nameKey: 'pricing.pkg.atelier', credits: 350, priceUsd: 420, kind: 'paid', featureKeys: [] },
  { id: 'business', nameKey: 'pricing.pkg.business', credits: null, priceUsd: null, kind: 'business', featureKeys: [] },
]

function cardClass(popular?: boolean) {
  return `relative rounded-2xl border p-6 ${popular ? 'border-white bg-[#161616]' : 'border-[#242424] bg-[#141414]'}`
}

function ctaClass(popular?: boolean) {
  return `mt-6 block rounded-lg py-2.5 text-center text-sm font-medium transition ${
    popular ? 'bg-white text-[#0a0a0a] hover:bg-neutral-200' : 'border border-[#2a2a2a] text-neutral-200 hover:bg-[#1a1a1a]'
  }`
}

export default function PricingPage() {
  const { t } = useI18n()
  const [checkoutPkg, setCheckoutPkg] = useState<Package | null>(null)

  return (
    <>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-neutral-100">{t('pricing.title')}</h1>
          <p className="mt-2 text-sm text-neutral-500">{t('pricing.subtitle')}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {PACKAGES.map((pkg) => (
            <div key={pkg.id} className={cardClass(pkg.popular)}>
              {pkg.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-[11px] font-medium text-[#0a0a0a]">
                  {t('pricing.popular')}
                </span>
              )}

              <p className="text-sm font-medium text-neutral-400">{t(pkg.nameKey)}</p>

              {pkg.kind === 'free' && (
                <>
                  <p className="mt-3 text-3xl font-medium text-neutral-100">
                    {pkg.credits}{' '}
                    <span className="text-base text-neutral-400">{t('pricing.credits')}</span>
                  </p>
                  <p className="mt-2 text-sm text-neutral-500">{t('pricing.freeDesc')}</p>
                  <span className="mt-6 inline-block rounded-full border border-[#2a2a2a] px-3 py-1 text-[11px] text-neutral-500">
                    {t('pricing.freeBadge')}
                  </span>
                </>
              )}

              {pkg.kind === 'paid' && pkg.credits != null && pkg.priceUsd != null && (
                <>
                  <p className="mt-3 text-3xl font-medium text-neutral-100">
                    {pkg.credits}{' '}
                    <span className="text-base text-neutral-400">{t('pricing.credits')}</span>
                  </p>
                  <div className="mt-5">
                    <p className="text-2xl font-medium text-white">${pkg.priceUsd}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{t('pricing.vatIncluded')}</p>
                  </div>
                  {pkg.featureKeys.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {pkg.featureKeys.map((key) => (
                        <li key={key} className="flex items-center gap-2 text-sm text-neutral-300">
                          <Check className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                          {t(key)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" className={ctaClass(pkg.popular)} onClick={() => setCheckoutPkg(pkg)}>
                    {t('pricing.buy')}
                  </button>
                </>
              )}

              {pkg.kind === 'business' && (
                <>
                  <p className="mt-4 text-sm leading-relaxed text-neutral-400">{t('pricing.businessDesc')}</p>
                  {pkg.featureKeys.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {pkg.featureKeys.map((key) => (
                        <li key={key} className="flex items-center gap-2 text-sm text-neutral-300">
                          <Check className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                          {t(key)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <a
                    href="mailto:info@lioralabs.io?subject=Liora%20Business"
                    className={ctaClass(false)}
                  >
                    {t('pricing.cta')}
                  </a>
                </>
              )}
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-neutral-500">{t('pricing.contactNote')}</p>
      </main>

      <SiteFooter />
      <CheckoutModal pkg={checkoutPkg} onClose={() => setCheckoutPkg(null)} />
    </>
  )
}
