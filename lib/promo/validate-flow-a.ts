/**
 * Server-side validator for Flow-A promo codes (used by `/api/payments/create`
 * and `/api/promo/validate`). No DB writes — only computes the discount.
 *
 * "Activation" of a Flow-A promo (incrementing redemptions, writing to
 * promo_redemptions) happens later in the webhook handler, after the bank
 * confirms the payment.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type { PaymentPackage } from '@/lib/pricing'

export type PromoValidateResult =
  | {
      valid: true
      promoId: string
      code: string
      discountPercent: number
      bonusModules: number
      finalAmountMinor: number
    }
  | {
      valid: false
      errorCode:
        | 'invalid_code_format'
        | 'not_found'
        | 'inactive'
        | 'expired'
        | 'limit_reached'
        | 'already_redeemed'
        | 'wrong_flow'
        | 'wrong_market'
        | 'server_error'
    }

interface PromoRow {
  id: string
  code: string
  flow: 'a' | 'b'
  discount_percent: number | null
  bonus_modules: number | null
  market: 'ru' | 'eu' | 'all'
  modules_reward: number
  max_redemptions: number | null
  current_redemptions: number | null
  valid_until: string | null
  one_per_user: boolean | null
  is_active: boolean | null
}

export async function validateFlowAPromo(args: {
  rawCode: string
  pkg: PaymentPackage
  userId: string
}): Promise<PromoValidateResult> {
  const code = args.rawCode.trim().toUpperCase()
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return { valid: false, errorCode: 'invalid_code_format' }
  }

  const admin = createAdminClient()
  const { data: row, error } = await admin
    .from('promo_codes')
    .select(
      'id, code, flow, discount_percent, bonus_modules, market, modules_reward, max_redemptions, current_redemptions, valid_until, one_per_user, is_active',
    )
    .eq('code', code)
    .maybeSingle()

  if (error) {
    console.error('[promo-validate] DB error', error)
    return { valid: false, errorCode: 'server_error' }
  }
  if (!row) return { valid: false, errorCode: 'not_found' }

  const promo = row as PromoRow

  if (promo.flow !== 'a') return { valid: false, errorCode: 'wrong_flow' }
  if (!promo.is_active) return { valid: false, errorCode: 'inactive' }
  if (promo.valid_until && new Date(promo.valid_until).getTime() < Date.now()) {
    return { valid: false, errorCode: 'expired' }
  }
  if (
    promo.max_redemptions !== null &&
    (promo.current_redemptions ?? 0) >= promo.max_redemptions
  ) {
    return { valid: false, errorCode: 'limit_reached' }
  }
  if (promo.market !== 'all' && promo.market !== args.pkg.market) {
    return { valid: false, errorCode: 'wrong_market' }
  }
  if (promo.discount_percent === null) {
    return { valid: false, errorCode: 'wrong_flow' }
  }

  if (promo.one_per_user !== false) {
    const { data: existing } = await admin
      .from('promo_redemptions')
      .select('id')
      .eq('promo_id', promo.id)
      .eq('user_id', args.userId)
      .maybeSingle()
    if (existing) return { valid: false, errorCode: 'already_redeemed' }
  }

  const finalAmountMinor = Math.max(
    100,
    Math.round((args.pkg.priceMinor * (100 - promo.discount_percent)) / 100),
  )

  return {
    valid: true,
    promoId: promo.id,
    code: promo.code,
    discountPercent: promo.discount_percent,
    bonusModules: promo.bonus_modules ?? 0,
    finalAmountMinor,
  }
}
