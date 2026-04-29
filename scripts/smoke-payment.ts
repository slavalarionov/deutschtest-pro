/**
 * Smoke-test helper for the live Tochka acquiring integration.
 *
 *   npx tsx scripts/smoke-payment.ts <user-email>
 *
 * Looks up (or creates) a profile for the given email via the service
 * role, inserts a `payments` row using lib/pricing.PACKAGES['ru-starter'],
 * calls Tochka.createPayment directly to obtain a paymentLink, persists
 * the operationId, and prints `orderId`, `provider_operation_id` and
 * `paymentUrl`.
 *
 * After printing the URL: open it in a browser, pay 400 ₽ with a real
 * card, then visit /ru/payment/success?orderId=<orderId> on the running
 * site (or wait for the webhook to land if the public key is configured).
 *
 * To trigger a refund afterwards, pass `--refund <operationId>` instead.
 */
import { config } from 'dotenv'

config({ path: '.env.local' })

import { nanoid } from 'nanoid'
import { createClient } from '@supabase/supabase-js'
import { createPayment, refundPayment } from '@/lib/tochka/client'
import { PACKAGES } from '@/lib/pricing'

async function main() {
  const args = process.argv.slice(2)
  const refundFlagIdx = args.indexOf('--refund')
  if (refundFlagIdx >= 0) {
    const opId = args[refundFlagIdx + 1]
    if (!opId) {
      console.error('Usage: --refund <operationId>')
      process.exit(2)
    }
    const pkg = PACKAGES['ru-starter']
    await refundPayment(opId, pkg.priceMinor)
    console.log(`Refund initiated for operation ${opId}.`)
    console.log(
      'Money returns in 1–7 business days. Run a manual UPDATE on payments + ledger to reflect the refund.',
    )
    return
  }

  const email = args[0]
  if (!email) {
    console.error('Usage: npx tsx scripts/smoke-payment.ts <user-email>')
    process.exit(2)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://deutschtest.pro'
  if (!supabaseUrl || !serviceKey) {
    console.error('Supabase env not set in .env.local')
    process.exit(1)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .maybeSingle()
  if (profileErr) {
    console.error(profileErr)
    process.exit(1)
  }
  if (!profile) {
    console.error(
      `No profile with email ${email}. Sign up at /ru/register first, then re-run.`,
    )
    process.exit(1)
  }

  const pkg = PACKAGES['ru-starter']
  const orderId = nanoid(12).toLowerCase()

  const { data: row, error: insertErr } = await admin
    .from('payments')
    .insert({
      user_id: profile.id,
      provider: 'tochka',
      order_id: orderId,
      package_id: pkg.id,
      package_size: pkg.modules,
      amount_currency: pkg.currency,
      amount_minor: pkg.priceMinor,
      promo_code_id: null,
      promo_discount_minor: 0,
      promo_bonus_modules: 0,
      status: 'pending',
      locale_at_purchase: 'ru',
      user_agent: 'smoke-script',
    })
    .select('id')
    .single()
  if (insertErr || !row) {
    console.error(insertErr)
    process.exit(1)
  }

  const purpose = `Оплата пакета Starter (${pkg.modules} модулей) — DeutschTest.pro`
  const tochka = await createPayment({
    amountMinor: pkg.priceMinor,
    purpose,
    paymentMode: ['card', 'sbp'],
    redirectUrl: `${appUrl}/ru/payment/success?orderId=${orderId}`,
    failRedirectUrl: `${appUrl}/ru/payment/cancel?orderId=${orderId}`,
    clientEmail: profile.email,
  })

  await admin
    .from('payments')
    .update({
      provider_operation_id: tochka.operationId,
      provider_payment_link: tochka.paymentLink,
    })
    .eq('id', row.id)

  console.log('---')
  console.log('orderId             :', orderId)
  console.log('provider_operationId:', tochka.operationId)
  console.log('paymentUrl          :', tochka.paymentLink)
  console.log('---')
  console.log(
    `Open paymentUrl, pay 400 ₽ with a card, then visit\n  ${appUrl}/ru/payment/success?orderId=${orderId}`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
