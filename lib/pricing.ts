import type { Locale } from '@/i18n/request'

export type PricingCurrency = 'RUB' | 'EUR'
export type PricingPackageKey = 'starter' | 'standard' | 'intensive'

export interface PricingPackage {
  key: PricingPackageKey
  modules: number
  prices: Record<PricingCurrency, number>
  originalPrices: Record<PricingCurrency, number | null>
  highlighted: boolean
  hasBadge: boolean
  featureCount: number
}

export function currencyForLocale(locale: Locale | string): PricingCurrency {
  return locale === 'ru' ? 'RUB' : 'EUR'
}

export const PRICING_PACKAGES: PricingPackage[] = [
  {
    key: 'starter',
    modules: 10,
    prices: { RUB: 400, EUR: 4 },
    originalPrices: { RUB: null, EUR: null },
    highlighted: false,
    hasBadge: false,
    featureCount: 3,
  },
  {
    key: 'standard',
    modules: 20,
    prices: { RUB: 720, EUR: 7.2 },
    originalPrices: { RUB: 800, EUR: 8 },
    highlighted: true,
    hasBadge: true,
    featureCount: 4,
  },
  {
    key: 'intensive',
    modules: 40,
    prices: { RUB: 1360, EUR: 13.6 },
    originalPrices: { RUB: 1600, EUR: 16 },
    highlighted: false,
    hasBadge: true,
    featureCount: 5,
  },
]

export function fractionDigitsForAmount(amount: number, currency: PricingCurrency): number {
  if (currency === 'RUB') return 0
  return Number.isInteger(amount) ? 0 : 2
}
