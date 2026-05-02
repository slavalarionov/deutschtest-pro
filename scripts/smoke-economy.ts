/* eslint-disable no-console */
/**
 * Smoke-тест утилит lib/economy/* против реальной прод-БД.
 * Запуск: npx tsx --env-file=.env.local scripts/smoke-economy.ts
 *
 * Не часть CI; локальная проверка после миграций 038/039/040.
 */
import {
  getExchangeRate,
  convertToUsd,
  __resetExchangeRateMemoryCacheForTests,
} from '../lib/economy/exchange-rates'
import { applyCommission } from '../lib/economy/commissions'
import { getMonthlyFixedCostsUsd, listFixedCosts } from '../lib/economy/fixed-costs'

async function main() {
  __resetExchangeRateMemoryCacheForTests()

  const usdRub = await getExchangeRate('USD', 'RUB')
  const usdEur = await getExchangeRate('USD', 'EUR')
  console.log(`USD→RUB = ${usdRub}`)
  console.log(`USD→EUR = ${usdEur}`)

  const rub1000Usd = await convertToUsd(1000, 'RUB')
  const eur100Usd = await convertToUsd(100, 'EUR')
  console.log(`convertToUsd(1000 RUB) = $${rub1000Usd.toFixed(4)}`)
  console.log(`convertToUsd(100 EUR)  = $${eur100Usd.toFixed(4)}`)

  const tochka = applyCommission(1000, 'tochka')
  const prodamus = applyCommission(1000, 'prodamus')
  console.log(`applyCommission(1000, 'tochka')   = ${JSON.stringify(tochka)}`)
  console.log(`applyCommission(1000, 'prodamus') = ${JSON.stringify(prodamus)}`)

  const fixedCosts = await listFixedCosts()
  console.log(`listFixedCosts() count = ${fixedCosts.length}`)
  for (const fc of fixedCosts) {
    console.log(`  · ${fc.name} — ${fc.amountNative} ${fc.nativeCurrency} / ${fc.period}`)
  }

  const monthlyUsd = await getMonthlyFixedCostsUsd()
  console.log(`getMonthlyFixedCostsUsd() = $${monthlyUsd.toFixed(2)}`)

  if (Math.abs(tochka.commission - 30) > 0.001 || Math.abs(tochka.net - 970) > 0.001) {
    throw new Error('applyCommission(1000, tochka) returned unexpected breakdown')
  }
  if (monthlyUsd <= 0) {
    throw new Error(`Expected getMonthlyFixedCostsUsd > 0, got ${monthlyUsd}`)
  }
  console.log('\n✓ smoke ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
