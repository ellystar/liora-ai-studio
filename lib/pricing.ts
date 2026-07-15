export type PaidPackageId = 'baslangic' | 'studio'
export type BusinessPackageId = 'business'

export type PaidPackage = {
  id: PaidPackageId
  credits: number
  priceUsd: number
  priceTry: number
  popular?: boolean
}

export type BusinessPackage = {
  id: BusinessPackageId
  mailto: string
}

/** Tüm tutarlar yalnızca bu dosyada güncellenir. */
export const PAID_PACKAGES: PaidPackage[] = [
  { id: 'baslangic', credits: 20, priceUsd: 24, priceTry: 1120 },
  { id: 'studio', credits: 100, priceUsd: 120, priceTry: 5550, popular: true },
]

export const BUSINESS_PACKAGE: BusinessPackage = {
  id: 'business',
  mailto: 'mailto:info@lioralabs.io?subject=Liora%20Atelier%20Business',
}

export const MARQUEE_BRANDS = [
  { name: 'DS DAMAT', style: 'sans-wide' },
  { name: 'Damat Tween', style: 'serif-italic' },
  { name: 'ADV', style: 'sans-bold' },
  { name: 'ORKA TEKNOLOJİ', style: 'sans-caps' },
  { name: 'KIĞILI', style: 'serif' },
  { name: 'BRIX', style: 'sans-italic' },
] as const

export function formatUsd(amount: number): string {
  return `$${amount}`
}

export function formatTry(amount: number): string {
  return `₺${amount.toLocaleString('tr-TR')}`
}

export function formatPriceLine(priceUsd: number, priceTry: number): string {
  return `${formatUsd(priceUsd)} · ${formatTry(priceTry)}`
}
