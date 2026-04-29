/**
 * One-shot helper: lists customers behind your TOCHKA_JWT_TOKEN.
 *
 *   npx tsx scripts/check-tochka-customers.ts
 *
 * Use the `customerCode` of the customer whose `customerType: "Business"`
 * row has acquiring enabled — that goes into TOCHKA_CUSTOMER_CODE in
 * `.env.local` (and Vercel env vars).
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

async function main() {
  const token = process.env.TOCHKA_JWT_TOKEN
  const baseUrl =
    process.env.TOCHKA_API_BASE_URL ?? 'https://enter.tochka.com/uapi/'
  if (!token) {
    console.error('TOCHKA_JWT_TOKEN is not set in .env.local')
    process.exit(1)
  }

  const url = `${baseUrl.replace(/\/$/, '')}/open-banking/v1.0/customers`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  console.log('Status:', res.status)
  const text = await res.text()
  try {
    console.log(JSON.stringify(JSON.parse(text), null, 2))
  } catch {
    console.log(text.slice(0, 4000))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
