export const RUB_TO_EUR = 100

export function formatExamPrice(rubAmount: number, locale: string): string {
  if (locale === 'ru') {
    return `${new Intl.NumberFormat('ru-RU').format(rubAmount)} ₽`
  }

  const euros = Math.round(rubAmount / RUB_TO_EUR)
  const formatted = new Intl.NumberFormat(locale).format(euros)

  if (locale === 'en') {
    return `€${formatted}`
  }
  return `${formatted} €`
}
