export const RUB_TO_EUR = 100

export function formatExamPrice(
  rubAmount: number,
  locale: string,
  opts?: { precision?: 'integer' | 'decimal' }
): string {
  if (locale === 'ru') {
    return `${new Intl.NumberFormat('ru-RU').format(rubAmount)} ₽`
  }

  const precision = opts?.precision ?? 'integer'
  const fractionDigits = precision === 'decimal' ? 2 : 0
  const eurosRaw = rubAmount / RUB_TO_EUR
  const value = precision === 'decimal' ? eurosRaw : Math.round(eurosRaw)
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)

  if (locale === 'en') {
    return `€${formatted}`
  }
  return `${formatted} €`
}
