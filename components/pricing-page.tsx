'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/language-provider'
import type { TranslationKey } from '@/lib/i18n/dictionaries'
import { createClient } from '@/lib/supabase/client'
import {
  PRICING_BRANDS,
  PRICING_PACKAGES,
  formatTry,
  formatUsd,
  type PaidPricingPackage,
  type PricingPackage,
} from '@/lib/pricing'

const LEGAL_LINKS = [
  { key: 'legal.footer.distanceSales' as const, href: 'https://lioralabs.io/mesafeli-satis' },
  { key: 'legal.footer.deliveryReturns' as const, href: 'https://lioralabs.io/iade-sartlari' },
  { key: 'legal.footer.privacy' as const, href: 'https://lioralabs.io/gizlilik' },
]

function packageLabelKey(id: PricingPackage['id']) {
  return `pricingPage.pkg.${id}` as const
}

export function PricingPage() {
  const { t } = useI18n()
  const router = useRouter()

  async function handleBuy(packageId: PaidPricingPackage['id']) {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    // TODO: PayTR iFrame entegrasyonu bu sayfaya kurulacak
    router.push(`/odeme?paket=${packageId}`)
  }

  function paidFeatures(credits: number) {
    return [
      t('pricingPage.feature.ecomFrames').replace('{count}', String(credits)),
      t('pricingPage.feature.allStudios'),
      t('pricingPage.feature.archive'),
    ]
  }

  function businessFeatures() {
    return [
      t('pricingPage.feature.customWorkflow'),
      t('pricingPage.feature.integrations'),
      t('pricingPage.feature.prioritySupport'),
    ]
  }

  return (
    <main className="atelier pricing-page mx-auto w-full max-w-4xl px-5 py-10 md:px-8 md:py-14">
      <header className="text-center">
        <p className="atelier-section-label">{t('pricingPage.sectionLabel')}</p>
        <h1 className="atelier-display mt-4 text-[28px] leading-[1.15] text-[#EDE8DF] md:text-[32px]">
          {t('pricingPage.title1')}
          <span className="mt-1 block text-[#8F8A80]">{t('pricingPage.title2')}</span>
        </h1>
      </header>

      <section className="pricing-marquee-wrap mt-12">
        <div className="pricing-marquee">
          <div className="pricing-marquee-track" aria-hidden>
            {[...PRICING_BRANDS, ...PRICING_BRANDS].map((brand, i) => (
              <span key={`${brand.name}-${i}`} className={`pricing-brand ${brand.className}`}>
                {brand.name}
              </span>
            ))}
          </div>
        </div>
        <p className="pricing-marquee-tagline">{t('pricingPage.marqueeTagline')}</p>
      </section>

      <section className="mx-auto mt-12 grid max-w-[780px] grid-cols-1 gap-4 md:grid-cols-3">
        {PRICING_PACKAGES.map((pkg) => (
          <PricingCard
            key={pkg.id}
            pkg={pkg}
            label={t(packageLabelKey(pkg.id))}
            features={pkg.kind === 'paid' ? paidFeatures(pkg.credits) : businessFeatures()}
            onBuy={handleBuy}
            t={t}
          />
        ))}
      </section>

      <footer className="pricing-footer mt-14 text-center">
        <p className="text-[11px] leading-relaxed text-[#57544D]">{t('pricingPage.footer.line1')}</p>
        <p className="mt-3 text-[11px] leading-relaxed text-[#57544D]">
          {LEGAL_LINKS.map((link, i) => (
            <span key={link.href}>
              {i > 0 && ' · '}
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="pricing-footer-link"
              >
                {t(link.key)}
              </a>
            </span>
          ))}
        </p>
      </footer>
    </main>
  )
}

function PricingCard({
  pkg,
  label,
  features,
  onBuy,
  t,
}: {
  pkg: PricingPackage
  label: string
  features: string[]
  onBuy: (id: PaidPricingPackage['id']) => void
  t: (key: TranslationKey) => string
}) {
  const isPopular = pkg.kind === 'paid' && pkg.popular
  const isBusiness = pkg.kind === 'business'

  return (
    <article className={`pricing-card ${isPopular ? 'is-popular' : ''}`}>
      {isPopular && (
        <span className="pricing-popular-badge">{t('pricingPage.popularBadge')}</span>
      )}

      <p className="atelier-section-label">{label}</p>

      {pkg.kind === 'paid' ? (
        <>
          <p className="atelier-display mt-4 text-[32px] leading-none text-[#EDE8DF]">
            {pkg.credits}
            <span className="ml-1.5 text-[12px] text-[#8F8A80]">{t('pricingPage.credits')}</span>
          </p>
          <p className="mt-4">
            <span className="text-[16px] text-[#EDE8DF]">{formatUsd(pkg.priceUsd)}</span>
            <span className="ml-1.5 text-[13px] text-[#A39D92]">· {formatTry(pkg.priceTry)}</span>
          </p>
        </>
      ) : (
        <>
          <p className="atelier-display mt-4 text-[32px] leading-none text-[#EDE8DF]">
            {t('pricingPage.customPrice')}
          </p>
          <p className="mt-4 h-[22px]" aria-hidden />
        </>
      )}

      <div className="pricing-card-divider" />

      <ul className="space-y-0">
        {features.map((feature) => (
          <li key={feature} className="text-[12px] leading-[1.9] text-[#A39D92]">
            {feature}
          </li>
        ))}
      </ul>

      {isBusiness ? (
        <a href={pkg.contactMailto} className="pricing-cta pricing-cta-ghost mt-6 block text-center">
          {t('pricingPage.contact')}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => onBuy(pkg.id)}
          className={`pricing-cta mt-6 w-full ${isPopular ? 'pricing-cta-filled' : 'pricing-cta-ghost'}`}
        >
          {t('pricingPage.buy')}
        </button>
      )}
    </article>
  )
}
