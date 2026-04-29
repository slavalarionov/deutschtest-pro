/**
 * POST /api/payments/create
 *
 * Body: { packageId, promoCode?, locale }
 * Auth: required.
 *
 * Validates locale ↔ package market match, applies optional Flow-A promo,
 * inserts a `pending` payment row, calls Tochka acquiring, persists the
 * paymentLink, returns { orderId, paymentUrl }.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/get-client-ip'
import { getAppUrl } from '@/lib/env'
import { getPackage, getMarketForLocale } from '@/lib/pricing'
import { createPayment } from '@/lib/tochka/client'
import { TochkaApiError, TochkaServerError } from '@/lib/tochka/types'
import { validateFlowAPromo } from '@/lib/promo/validate-flow-a'

export const runtime = 'nodejs'
export const maxDuration = 30

const BodySchema = z.object({
  packageId: z.string(),
  promoCode: z.string().optional(),
  locale: z.enum(['ru', 'de', 'en', 'tr']),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Authorization required.', code: 'unauthorized' },
      { status: 401 },
    )
  }

  // Tochka's payments_with_receipt requires a buyer email so the receipt
  // can be delivered through Бизнес.Ру → ОФД → ФНС. Our flow always
  // registers users via email + password, so this guard is defensive —
  // protects against a future signup path that lacks an email.
  if (!user.email || user.email.trim().length === 0) {
    return NextResponse.json(
      { error: 'Email is required for fiscal receipt.', code: 'email_required_for_receipt' },
      { status: 400 },
    )
  }

  const ip = getClientIp(req) ?? 'unknown'
  const limit = rateLimit(`payment:${user.id}:${ip}`, 10, 10 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in a few minutes.', code: 'rate_limited' },
      { status: 429 },
    )
  }

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid request body.', code: 'bad_request' }, { status: 400 })
  }

  const pkg = getPackage(body.packageId)
  if (!pkg) {
    return NextResponse.json(
      { error: 'Unknown package.', code: 'invalid_package' },
      { status: 400 },
    )
  }

  if (getMarketForLocale(body.locale) !== pkg.market) {
    return NextResponse.json(
      { error: 'Package does not match locale.', code: 'package_market_mismatch' },
      { status: 400 },
    )
  }

  if (pkg.market === 'eu') {
    return NextResponse.json(
      {
        error: 'International payments are not yet available.',
        code: 'international_payments_not_yet_available',
      },
      { status: 400 },
    )
  }

  let amountMinor = pkg.priceMinor
  let promoId: string | null = null
  let promoDiscountMinor = 0
  let promoBonusModules = 0

  if (body.promoCode && body.promoCode.trim().length > 0) {
    const result = await validateFlowAPromo({
      rawCode: body.promoCode,
      pkg,
      userId: user.id,
    })
    if (!result.valid) {
      return NextResponse.json(
        { error: 'Promo code rejected.', code: result.errorCode },
        { status: 400 },
      )
    }
    promoId = result.promoId
    promoDiscountMinor = pkg.priceMinor - result.finalAmountMinor
    promoBonusModules = result.bonusModules
    amountMinor = result.finalAmountMinor
  }

  if (amountMinor < 100) {
    return NextResponse.json(
      { error: 'Final amount too low.', code: 'amount_too_low' },
      { status: 400 },
    )
  }

  const orderId = nanoid(12).toLowerCase()
  const admin = createAdminClient()

  const { data: paymentRow, error: insertErr } = await admin
    .from('payments')
    .insert({
      user_id: user.id,
      provider: 'tochka',
      order_id: orderId,
      package_id: pkg.id,
      package_size: pkg.modules,
      amount_currency: pkg.currency,
      amount_minor: amountMinor,
      promo_code_id: promoId,
      promo_discount_minor: promoDiscountMinor,
      promo_bonus_modules: promoBonusModules,
      status: 'pending',
      locale_at_purchase: body.locale,
      user_agent: req.headers.get('user-agent') ?? null,
      ip_address: ip !== 'unknown' ? ip : null,
    })
    .select('id')
    .single()

  if (insertErr || !paymentRow) {
    console.error('[payments/create] insert error', insertErr)
    return NextResponse.json(
      { error: 'Could not create payment record.', code: 'db_error' },
      { status: 500 },
    )
  }

  const appUrl = getAppUrl()

  try {
    const tochka = await createPayment({
      packageId: pkg.id,
      amountMinor,
      redirectUrl: `${appUrl}/${body.locale}/payment/success?orderId=${orderId}`,
      failRedirectUrl: `${appUrl}/${body.locale}/payment/cancel?orderId=${orderId}`,
      clientEmail: user.email,
    })

    await admin
      .from('payments')
      .update({
        provider_operation_id: tochka.operationId,
        provider_payment_link: tochka.paymentLink,
      })
      .eq('id', paymentRow.id)

    return NextResponse.json({
      orderId,
      paymentUrl: tochka.paymentLink,
    })
  } catch (err) {
    await admin
      .from('payments')
      .update({ status: 'failed', status_updated_at: new Date().toISOString() })
      .eq('id', paymentRow.id)

    if (err instanceof TochkaApiError) {
      console.error('[payments/create] tochka 4xx', err.message, err.body)
      return NextResponse.json(
        {
          error: 'Payment provider rejected the request.',
          code: 'provider_rejected',
        },
        { status: 502 },
      )
    }
    if (err instanceof TochkaServerError) {
      console.error('[payments/create] tochka 5xx', err.body)
      return NextResponse.json(
        {
          error: 'Payment provider is unavailable. Please try again.',
          code: 'provider_unavailable',
        },
        { status: 502 },
      )
    }
    console.error('[payments/create] unexpected error', err)
    return NextResponse.json(
      { error: 'Internal error.', code: 'server_error' },
      { status: 500 },
    )
  }
}
