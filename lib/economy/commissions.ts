/**
 * Комиссии эквайринга.
 *
 * Точка-Банк — ~3% по нашему текущему тарифу.
 * Prodamus — ~10% (среднее, точная цифра зависит от объёма; уточнить
 * перед запуском EU-рынка).
 *
 * UI должен показывать gross и net рядом — пользователь хочет видеть,
 * сколько мы реально получаем после комиссии.
 */

export const ACQUIRER_COMMISSIONS = {
  tochka: 0.03,
  prodamus: 0.1,
} as const

export type AcquirerProvider = keyof typeof ACQUIRER_COMMISSIONS

export interface CommissionBreakdown {
  gross: number
  commission: number
  net: number
}

export function applyCommission(
  grossAmount: number,
  provider: AcquirerProvider
): CommissionBreakdown {
  const rate = ACQUIRER_COMMISSIONS[provider]
  const commission = grossAmount * rate
  return {
    gross: grossAmount,
    commission,
    net: grossAmount - commission,
  }
}
