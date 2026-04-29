/**
 * POST /api/promo/validate
 *
 * Body: { code, packageId, locale }
 * Auth: required.
 *
 * Pre-flight check for Flow-A promo codes from the pricing page. Performs
 * no DB writes — actual activation happens in the webhook handler after
 * Точка confirms the payment.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getPackage, getMarketForLocale } from '@/lib/pricing'
import { validateFlowAPromo } from '@/lib/promo/validate-flow-a'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/get-client-ip'

export const runtime = 'nodejs'
export const maxDuration = 10

const BodySchema = z.object({
  code: z.string().min(1).max(64),
  packageId: z.string(),
  locale: z.enum(['ru', 'de', 'en', 'tr']),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json(
      { valid: false, errorCode: 'unauthorized' },
      { status: 401 },
    )
  }

  const ip = getClientIp(req) ?? 'unknown'
  const limit = rateLimit(`promo-validate:${user.id}:${ip}`, 30, 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json(
      { valid: false, errorCode: 'rate_limited' },
      { status: 429 },
    )
  }

  let body: z.infer<typeof BodySchema>
  try {
    body = BodySchema.parse(await req.json())
  } catch {
    return NextResponse.json(
      { valid: false, errorCode: 'bad_request' },
      { status: 400 },
    )
  }

  const pkg = getPackage(body.packageId)
  if (!pkg) {
    return NextResponse.json(
      { valid: false, errorCode: 'invalid_package' },
      { status: 400 },
    )
  }

  if (getMarketForLocale(body.locale) !== pkg.market) {
    return NextResponse.json(
      { valid: false, errorCode: 'package_market_mismatch' },
      { status: 400 },
    )
  }

  const result = await validateFlowAPromo({
    rawCode: body.code,
    pkg,
    userId: user.id,
  })

  if (!result.valid) {
    return NextResponse.json({ valid: false, errorCode: result.errorCode })
  }

  return NextResponse.json({
    valid: true,
    discountPercent: result.discountPercent,
    bonusModules: result.bonusModules,
    finalAmountMinor: result.finalAmountMinor,
    originalAmountMinor: pkg.priceMinor,
    currency: pkg.currency,
  })
}
