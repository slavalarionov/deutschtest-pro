/**
 * Единый источник истины для форматирования финансовых чисел в админке.
 * Используется везде в /admin/economy, /admin, /admin/fixed-costs.
 *
 * Все форматтеры детерминированные (без зависимости от Intl locale, чтобы
 * SSR давал тот же вывод, что клиент, и не было гидрационных мисматчей).
 */

export type EconomyCurrency = 'USD' | 'RUB' | 'EUR'

function withSeparators(integerPart: string, separator: string): string {
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
}

function splitDecimal(n: number, fractionDigits: number): { intStr: string; fracStr: string; sign: string } {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  const fixed = abs.toFixed(fractionDigits)
  const [intStr, fracStr = ''] = fixed.split('.')
  return { intStr, fracStr, sign }
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return '$0.00'
  if (Math.abs(n) >= 1000) {
    const { intStr, fracStr, sign } = splitDecimal(n, 2)
    const grouped = withSeparators(intStr, ',')
    return `${sign}$${grouped}.${fracStr}`
  }
  if (Math.abs(n) > 0 && Math.abs(n) < 0.01) {
    const { intStr, fracStr, sign } = splitDecimal(n, 4)
    return `${sign}$${intStr}.${fracStr}`
  }
  const { intStr, fracStr, sign } = splitDecimal(n, 2)
  return `${sign}$${intStr}.${fracStr}`
}

export function formatRub(n: number): string {
  if (!Number.isFinite(n)) return '0 ₽'
  const { intStr, sign } = splitDecimal(n, 0)
  return `${sign}${withSeparators(intStr, ' ')} ₽`
}

export function formatEur(n: number): string {
  if (!Number.isFinite(n)) return '0,00 €'
  const { intStr, fracStr, sign } = splitDecimal(n, 2)
  const grouped = withSeparators(intStr, ' ')
  return `${sign}${grouped},${fracStr} €`
}

export function formatNative(n: number, currency: EconomyCurrency): string {
  if (currency === 'USD') return formatUsd(n)
  if (currency === 'RUB') return formatRub(n)
  return formatEur(n)
}

export function formatPercent(n: number, fractionDigits = 1): string {
  if (!Number.isFinite(n)) return '0%'
  return `${n.toFixed(fractionDigits)}%`
}

export function formatInteger(n: number): string {
  if (!Number.isFinite(n)) return '0'
  const { intStr, sign } = splitDecimal(n, 0)
  return `${sign}${withSeparators(intStr, ' ')}`
}

const MONTHS_RU = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК']

export function formatEditorialDate(input: Date | string | null | undefined): string {
  if (!input) return '—'
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getUTCDate()} ${MONTHS_RU[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
