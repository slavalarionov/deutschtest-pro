/**
 * POST /api/webhooks/tochka
 *
 * Critical path: receives signed JWT from Точка-Банк. Verifies with the
 * RS256 public key, then atomically credits modules through the
 * `approve_payment_atomic` SQL function. Idempotent: re-deliveries return
 * 200 OK without double-crediting.
 *
 * Side-effects (email, fiscal receipt) are best-effort and never block
 * the response — money is already in, modules are already credited, those
 * tasks can be retried manually.
 */
import { NextRequest } from 'next/server'
import { verifyTochkaWebhook } from '@/lib/tochka/webhook'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPaymentSuccessEmail } from '@/lib/email/payment-success'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const jwtString = (await req.text()).trim()
  if (!jwtString) {
    return new Response('Empty body', { status: 400 })
  }

  let payload
  try {
    payload = await verifyTochkaWebhook(jwtString)
  } catch (e) {
    console.error('[tochka-webhook] Invalid signature or payload', e)
    return new Response('Unauthorized', { status: 401 })
  }

  console.log('[tochka-webhook] received', {
    operationId: payload.operationId,
    status: payload.status,
    paymentLinkId: payload.paymentLinkId,
    paymentType: payload.paymentType,
    webhookType: payload.webhookType,
  })

  // Tochka exposes five webhook types (acquiringInternetPayment,
  // incomingPayment, outgoingPayment, incomingSbpPayment,
  // incomingSbpB2BPayment). We currently subscribe only to the first.
  // If the URL is ever wired to other types, ignore them outright —
  // their operationIds wouldn't map to our `payments` rows anyway, and
  // the early-return keeps the audit log clean.
  if (
    payload.webhookType &&
    payload.webhookType !== 'acquiringInternetPayment'
  ) {
    console.log('[tochka-webhook] ignoring non-acquiring webhook:', {
      webhookType: payload.webhookType,
    })
    return new Response('OK', { status: 200 })
  }

  if (payload.status !== 'APPROVED') {
    console.warn('[tochka-webhook] non-approved status, ignoring', {
      status: payload.status,
    })
    return new Response('OK', { status: 200 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.rpc('approve_payment_atomic', {
    p_provider_operation_id: payload.operationId,
    p_payment_method: payload.paymentType ?? 'card',
  })

  if (error) {
    if (error.message?.includes('payment_not_found')) {
      console.error('[tochka-webhook] payment not found', {
        operationId: payload.operationId,
      })
      return new Response('OK', { status: 200 })
    }
    console.error('[tochka-webhook] RPC error', error)
    return new Response('Internal Error', { status: 500 })
  }

  const result = (data as Array<{
    payment_id: string
    user_id: string
    modules_credited: number
    promo_code_id: string | null
    was_already_approved: boolean
  }>)?.[0]

  if (!result) {
    console.error('[tochka-webhook] empty RPC response')
    return new Response('Internal Error', { status: 500 })
  }

  if (result.was_already_approved) {
    console.log('[tochka-webhook] idempotent: already approved', {
      paymentId: result.payment_id,
    })
    return new Response('OK', { status: 200 })
  }

  console.log('[tochka-webhook] approved', {
    paymentId: result.payment_id,
    userId: result.user_id,
    modulesCredited: result.modules_credited,
  })

  // Activate Flow-A promo (record redemption + bump counter) — best-effort.
  if (result.promo_code_id) {
    void activateFlowAPromo(admin, {
      promoCodeId: result.promo_code_id,
      userId: result.user_id,
      modulesGranted: result.modules_credited,
    })
  }

  void Promise.allSettled([
    sendPaymentSuccessEmail({
      paymentId: result.payment_id,
      userId: result.user_id,
    }),
  ]).then((settled) => {
    settled.forEach((s) => {
      if (s.status === 'rejected') {
        console.error('[tochka-webhook] side-effect failed', s.reason)
      }
    })
  })

  return new Response('OK', { status: 200 })
}

async function activateFlowAPromo(
  admin: ReturnType<typeof createAdminClient>,
  input: { promoCodeId: string; userId: string; modulesGranted: number },
) {
  try {
    const { error: redemptionErr } = await admin
      .from('promo_redemptions')
      .insert({
        promo_id: input.promoCodeId,
        user_id: input.userId,
        modules_granted: input.modulesGranted,
      })
    if (redemptionErr && redemptionErr.code !== '23505') {
      console.error('[tochka-webhook] redemption insert failed', redemptionErr)
      return
    }

    const { data: promoRow } = await admin
      .from('promo_codes')
      .select('current_redemptions')
      .eq('id', input.promoCodeId)
      .maybeSingle()
    const next = (promoRow?.current_redemptions ?? 0) + 1
    await admin
      .from('promo_codes')
      .update({ current_redemptions: next })
      .eq('id', input.promoCodeId)
  } catch (e) {
    console.error('[tochka-webhook] promo activation failed', e)
  }
}
