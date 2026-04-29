import type { Locale } from '@/i18n/request'

export type Market = 'ru' | 'eu'
export type PackageTier = 'starter' | 'standard' | 'intensive'
export type Currency = 'RUB' | 'EUR'

export type PackageId =
  | 'ru-starter'
  | 'ru-standard'
  | 'ru-intensive'
  | 'eu-starter'
  | 'eu-standard'
  | 'eu-intensive'

export interface PaymentPackage {
  id: PackageId
  market: Market
  tier: PackageTier
  modules: number
  priceMinor: number
  originalPriceMinor: number | null
  discountPercent: number
  currency: Currency
}

export const PACKAGES: Record<PackageId, PaymentPackage> = {
  'ru-starter': {
    id: 'ru-starter',
    market: 'ru',
    tier: 'starter',
    modules: 10,
    priceMinor: 40000,
    originalPriceMinor: null,
    discountPercent: 0,
    currency: 'RUB',
  },
  'ru-standard': {
    id: 'ru-standard',
    market: 'ru',
    tier: 'standard',
    modules: 20,
    priceMinor: 72000,
    originalPriceMinor: 80000,
    discountPercent: 10,
    currency: 'RUB',
  },
  'ru-intensive': {
    id: 'ru-intensive',
    market: 'ru',
    tier: 'intensive',
    modules: 40,
    priceMinor: 136000,
    originalPriceMinor: 160000,
    discountPercent: 15,
    currency: 'RUB',
  },
  'eu-starter': {
    id: 'eu-starter',
    market: 'eu',
    tier: 'starter',
    modules: 20,
    priceMinor: 1000,
    originalPriceMinor: null,
    discountPercent: 0,
    currency: 'EUR',
  },
  'eu-standard': {
    id: 'eu-standard',
    market: 'eu',
    tier: 'standard',
    modules: 33,
    priceMinor: 1500,
    originalPriceMinor: 1667,
    discountPercent: 10,
    currency: 'EUR',
  },
  'eu-intensive': {
    id: 'eu-intensive',
    market: 'eu',
    tier: 'intensive',
    modules: 50,
    priceMinor: 2000,
    originalPriceMinor: 2500,
    discountPercent: 20,
    currency: 'EUR',
  },
}

export function getPackage(id: string): PaymentPackage | null {
  return PACKAGES[id as PackageId] ?? null
}

export function getMarketForLocale(locale: Locale | string): Market {
  return locale === 'ru' ? 'ru' : 'eu'
}

export function getPackagesForLocale(locale: Locale | string): PaymentPackage[] {
  const market = getMarketForLocale(locale)
  return Object.values(PACKAGES).filter((p) => p.market === market)
}

/**
 * Convert minor units to a major-unit decimal string for the Tochka API and
 * for any other major-unit textual representation. 40000 → "400.00",
 * 1500 → "15.00". The helper is currency-agnostic on purpose — Prodamus
 * for EUR will reuse it once that integration ships.
 */
export function minorToMajorString(minor: number): string {
  return (minor / 100).toFixed(2)
}

/**
 * Inverse of `minorToMajorString`. Used to read string amounts back from
 * Tochka webhook payloads and `getPaymentInfo` responses (Tochka may send
 * "0.33", "10", "400.00") into our integer-minor representation.
 *
 * Throws on non-numeric input so we surface bad provider data loudly.
 */
export function majorStringToMinor(major: string): number {
  const trimmed = major.trim()
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid major-unit amount string: ${JSON.stringify(major)}`)
  }
  return Math.round(parseFloat(trimmed) * 100)
}

/** Convert minor units to a major-unit number: 40000 → 400, 1500 → 15. */
export function minorToMajor(minor: number): number {
  return minor / 100
}

/** Простой формат цены для UI (без next-intl, для client-компонентов). */
export function formatPrice(minor: number, currency: Currency): string {
  const major = minor / 100
  if (currency === 'RUB') {
    return `${major.toLocaleString('ru-RU')} ₽`
  }
  return Number.isInteger(major) ? `€${major}` : `€${major.toFixed(2)}`
}
