'use client'

import { useRouter } from 'next/navigation'
import { useI18n } from '@/lib/i18n/language-provider'
import { createClient } from '@/lib/supabase/client'
import {
  BUSINESS_PACKAGE,
  MARQUEE_BRANDS,
  PAID_PACKAGES,
  formatTry,
  formatUsd,
} from '@/lib/pricing'

const LEGAL_LINKS = [
  { key: 'legal.footer.distanceSales' as const, href: 'https://lioralabs.io/mesafeli-satis' },
  { key: 'legal.footer.deliveryReturns' as const, href: 'https://lioralabs.io/iade-sartlari' },
  { key: 'legal.footer.privacy' as const, href: 'https://lioralabs.io/gizlilik' },
]

export function PricingPage() {
  const { t } = useI18n()
  const router = useRouter()

  async function onBuy(packageId: 'baslangic' | 'studio') {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    // TODO: ödeme sağlayıcısı entegrasyonu bu sayfaya kurulacak
    router.push(`/odeme?paket=${packageId}`)
  }

  const marqueeItems = [...MARQUEE_BRANDS, ...MARQUEE_BRANDS]

  return (
    <main className="atelier pricing-page mx-auto w-full max-w-4xl px-5 py-10 md:px-8 md:py-14">
      <header className="text-center">
        <p className="atelier-section-label">{t('pricingPage.sectionLabel')}</p>
        <h1 className="atelier-display mt-4 text-[28px] leading-[1.15] text-[#EDE8DF] md:text-[30px]">
          {t('pricingPage.title1')}
          <span className="mt-1 block text-[#8F8A80]">{t('pricingPage.title2')}</span>
        </h1>
      </header>

      <section className="pricing-marquee-section mt-12">
        <div className="pricing-marquee-inner">
          <div className="pricing-marquee-track">
              {marqueeItems.map((brand, index) => (
                <span
                  key={`${brand.name}-${index}`}
                  className={`pricing-marquee-brand pricing-marquee-brand--${brand.style}`}
                >
                  {brand.name}
                </span>
              ))}
            </div>
        </div>
        <p className="pricing-marquee-caption">{t('pricingPage.marqueeTagline')}</p>
      </section>

      <section className="pricing-cards mx-auto mt-12 grid max-w-[780px] grid-cols-1 gap-4 md:grid-cols-3">
        {PAID_PACKAGES.map((pkg) => {
          const isPopular = Boolean(pkg.popular)
          const labelKey = pkg.id === 'baslangic' ? 'pricingPage.pkg.baslangic' : 'pricingPage.pkg.studio'
          const features = [
            t('pricingPage.feature.ecomFrames').replace('{count}', String(pkg.credits)),
            t('pricingPage.feature.allStudios'),
            t('pricingPage.feature.archive'),
          ]

          return (
            <article
              key={pkg.id}
              className={`pricing-card ${isPopular ? 'pricing-card--popular' : ''}`}
            >
              {isPopular && (
                <span className="pricing-card-badge">{t('pricingPage.popularBadge')}</span>
              )}

              <p className="atelier-section-label">{t(labelKey)}</p>

              <p className="pricing-card-credits atelier-display">
                {pkg.credits}
                <span className="pricing-card-credits-unit">{t('pricingPage.credits')}</span>
              </p>

              <p className="pricing-card-price">
                <span className="pricing-card-price-usd">{formatUsd(pkg.priceUsd)}</span>
                <span className="pricing-card-price-try"> · {formatTry(pkg.priceTry)}</span>
              </p>

              <div className="pricing-card-rule" />

              <ul className="pricing-card-features">
                {features.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => onBuy(pkg.id)}
                className={`pricing-card-cta ${isPopular ? 'pricing-card-cta--filled' : 'pricing-card-cta--ghost'}`}
              >
                {t('pricingPage.buy')}
              </button>
            </article>
          )
        })}

        <article className="pricing-card">
          <p className="atelier-section-label">{t('pricingPage.pkg.business')}</p>

          <p className="pricing-card-custom atelier-display">{t('pricingPage.customPrice')}</p>

          <div className="pricing-card-spacer" aria-hidden />

          <div className="pricing-card-rule" />

          <ul className="pricing-card-features">
            <li>{t('pricingPage.feature.customWorkflow')}</li>
            <li>{t('pricingPage.feature.integrations')}</li>
            <li>{t('pricingPage.feature.prioritySupport')}</li>
          </ul>

          <a href={BUSINESS_PACKAGE.mailto} className="pricing-card-cta pricing-card-cta--ghost">
            {t('pricingPage.contact')}
          </a>
        </article>
      </section>

      <footer className="pricing-footer mt-14 text-center">
        <p className="pricing-footer-line">{t('pricingPage.footer.line1')}</p>
        <p className="pricing-footer-line mt-3">
          {LEGAL_LINKS.map((link, index) => (
            <span key={link.href}>
              {index > 0 && ' · '}
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="pricing-footer-link">
                {t(link.key)}
              </a>
            </span>
          ))}
        </p>
      </footer>
    </main>
  )
}
