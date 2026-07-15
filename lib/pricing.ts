export type PaidPackageId = 'baslangic' | 'studio'
export type BusinessPackageId = 'business'
export type PricingPackageId = PaidPackageId | BusinessPackageId

export type PaidPricingPackage = {
  id: PaidPackageId
  kind: 'paid'
  credits: number
  priceUsd: number
  priceTry: number
  popular?: boolean
}

export type BusinessPricingPackage = {
  id: BusinessPackageId
  kind: 'business'
  contactMailto: string
}

export type PricingPackage = PaidPricingPackage | BusinessPricingPackage

/** Tüm fiyat tutarları yalnızca bu dosyada güncellenir. */
export const PRICING_PACKAGES: PricingPackage[] = [
  {
    id: 'baslangic',
    kind: 'paid',
    credits: 20,
    priceUsd: 24,
    priceTry: 1120,
  },
  {
    id: 'studio',
    kind: 'paid',
    credits: 100,
    priceUsd: 120,
    priceTry: 5550,
    popular: true,
  },
  {
    id: 'business',
    kind: 'business',
    contactMailto: 'mailto:info@lioralabs.io?subject=Liora%20Atelier%20Business',
  },
]

export const PRICING_BRANDS = [
  { name: 'DS DAMAT', className: 'pricing-brand-sans-wide' },
  { name: 'Damat Tween', className: 'pricing-brand-serif-italic' },
  { name: 'ADV', className: 'pricing-brand-sans-bold' },
  { name: 'ORKA TEKNOLOJİ', className: 'pricing-brand-sans-caps' },
  { name: 'KIĞILI', className: 'pricing-brand-serif' },
  { name: 'BRIX', className: 'pricing-brand-sans-italic' },
] as const

export function formatUsd(amount: number): string {
  return `$${amount}`
}

export function formatTry(amount: number): string {
  return `₺${amount.toLocaleString('tr-TR')}`
}
