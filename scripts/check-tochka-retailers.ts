/**
 * One-shot helper: lists retailers (siteUid = merchantId) under your
 * TOCHKA_CUSTOMER_CODE.
 *
 *   npx tsx scripts/check-tochka-retailers.ts
 *
 * Copy the `siteUid` (15 digits) of the retail point that has internet
 * acquiring enabled and put it into `.env.local` (and Timeweb env) as
 * `TOCHKA_MERCHANT_ID`. The Tochka acquiring API rejects Create Payment
 * Operation requests without it.
 *
 * The exact response shape is mildly underdocumented — the script prints
 * the raw JSON in any case, so even if Tochka changes the layout you can
 * still read the value off the dump.
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

interface Retailer {
  siteUid?: string
  merchantId?: string
  name?: string
  url?: string
  status?: string
}

async function main() {
  const token = process.env.TOCHKA_JWT_TOKEN
  const customerCode = process.env.TOCHKA_CUSTOMER_CODE
  const baseUrl =
    process.env.TOCHKA_API_BASE_URL ?? 'https://enter.tochka.com/uapi/'

  if (!token) {
    console.error('TOCHKA_JWT_TOKEN is not set in .env.local')
    process.exit(1)
  }
  if (!customerCode) {
    console.error('TOCHKA_CUSTOMER_CODE is not set in .env.local')
    process.exit(1)
  }

  const url = `${baseUrl.replace(/\/$/, '')}/acquiring/v1.0/retailers?customerCode=${encodeURIComponent(customerCode)}`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  console.log('Status:', res.status)

  const text = await res.text()
  let data: unknown = null
  try {
    data = JSON.parse(text)
    console.log(JSON.stringify(data, null, 2))
  } catch {
    console.log(text.slice(0, 4000))
    return
  }

  const top = data as { Data?: { Retailer?: Retailer[]; Retailers?: Retailer[] } }
  const retailers = top?.Data?.Retailer ?? top?.Data?.Retailers ?? []

  if (Array.isArray(retailers) && retailers.length > 0) {
    console.log('\n========================================')
    console.log('Найденные торговые точки (siteUid = merchantId):')
    console.log('========================================')
    for (const r of retailers) {
      const id = r.siteUid ?? r.merchantId ?? '(нет)'
      console.log(`  • ${r.name ?? '(без названия)'}: siteUid = ${id}`)
    }
    console.log('========================================')
    console.log(
      'Скопируй нужный siteUid (15 цифр) и положи в env как TOCHKA_MERCHANT_ID.\n',
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
