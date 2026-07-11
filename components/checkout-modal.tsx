'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '@/lib/i18n/language-provider'
import type { TranslationKey } from '@/lib/i18n/dictionaries'
import './checkout-modal.css'

const DISTANCE_SALES_URL = 'https://lioralabs.io/mesafeli-satis'
const DELIVERY_RETURNS_URL = 'https://lioralabs.io/iade-sartlari'

export type CheckoutPackage = {
  id: string
  nameKey: TranslationKey
  credits: number | null
  priceUsd: number | null
  kind: 'free' | 'paid' | 'business'
  popular?: boolean
  featureKeys: TranslationKey[]
}

function ConsentWithLinks({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const { t } = useI18n()
  const template = t('checkout.consent1')
  const distanceSales = t('checkout.link.distanceSales')
  const deliveryReturns = t('checkout.link.deliveryReturns')

  const parts = template.split(/\{distanceSales\}|\{deliveryReturns\}/)
  const tokens = template.match(/\{distanceSales\}|\{deliveryReturns\}/g) ?? []

  return (
    <label className="cm-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {tokens[i] === '{distanceSales}' && (
              <a href={DISTANCE_SALES_URL} target="_blank" rel="noopener noreferrer">
                {distanceSales}
              </a>
            )}
            {tokens[i] === '{deliveryReturns}' && (
              <a href={DELIVERY_RETURNS_URL} target="_blank" rel="noopener noreferrer">
                {deliveryReturns}
              </a>
            )}
          </span>
        ))}
      </span>
    </label>
  )
}

export function CheckoutModal({
  pkg,
  onClose,
}: {
  pkg: CheckoutPackage | null
  onClose: () => void
}) {
  const { t } = useI18n()
  const [consent1, setConsent1] = useState(false)
  const [consent2, setConsent2] = useState(false)
  const [comingSoon, setComingSoon] = useState(false)

  useEffect(() => {
    if (pkg) return
    setConsent1(false)
    setConsent2(false)
    setComingSoon(false)
  }, [pkg])

  useEffect(() => {
    if (!pkg) return
    setConsent1(false)
    setConsent2(false)
    setComingSoon(false)
  }, [pkg?.id])

  useEffect(() => {
    if (!pkg) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pkg, onClose])

  if (!pkg) return null

  const canPay = consent1 && consent2

  function handlePay() {
    if (!canPay) return
    console.log('Checkout package:', pkg)
    setComingSoon(true)
  }

  return (
    <div className="checkout-modal" role="dialog" aria-modal="true" aria-labelledby="cm-title">
      <div className="cm-overlay" onClick={onClose} aria-hidden />
      <div className="cm-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="cm-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2 id="cm-title" className="cm-title">
          {t('checkout.title')}
        </h2>

        <div className="cm-summary">
          <p className="cm-pkg-name">{t(pkg.nameKey)}</p>
          {pkg.credits != null && (
            <p className="cm-credits">
              {pkg.credits} {t('pricing.credits')}
            </p>
          )}
          {pkg.priceUsd != null && (
            <div className="cm-price-row">
              <span className="cm-price">${pkg.priceUsd}</span>
              <span className="cm-vat">{t('pricing.vatIncluded')}</span>
            </div>
          )}
        </div>

        <p className="cm-try-note">{t('checkout.tryNote')}</p>

        <div className="cm-checks">
          <ConsentWithLinks checked={consent1} onChange={setConsent1} />
          <label className="cm-check">
            <input
              type="checkbox"
              checked={consent2}
              onChange={(e) => setConsent2(e.target.checked)}
            />
            <span>{t('checkout.consent2')}</span>
          </label>
        </div>

        <button type="button" className="cm-pay" disabled={!canPay} onClick={handlePay}>
          {t('checkout.pay')}
        </button>

        {comingSoon && (
          <p className="cm-coming-soon" role="status" aria-live="polite">
            {t('checkout.comingSoon')}
          </p>
        )}
      </div>
    </div>
  )
}
