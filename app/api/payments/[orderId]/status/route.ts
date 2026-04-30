/**
 * GET /api/payments/[orderId]/status
 *
 * Auth: required. Returns 404 if the order does not belong to the current user
 * (so we don't leak existence of other users' orders).
 *
 * Used by the success page client component to poll until status flips
 * from `pending` to `approved`. Adds a *provider* polling fallback: if the
 * row has been pending for more than POLLING_GRACE_MS, we ask Tochka via
 * `getPaymentInfo(operationId)` whether the operation has actually
 * succeeded server-side. If it has, we credit modules through the same
 * `approve_payment_atomic` RPC the webhook uses — so this path is fully
 * idempotent against a webhook that arrives later.
 *
 * This keeps the integration usable even before webhooks are activated
 * in the Tochka cabinet.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPaymentInfo } from '@/lib/tochka/client'
import { TochkaApiError, TochkaServerError } from '@/lib/tochka/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** How long we wait before pinging Tochka — gives the webhook a chance first. */
const POLLING_GRACE_MS = 10_000

interface PaymentRow {
  id: string
  status: 'pending' | 'approved' | 'failed' | 'refunded' | 'expired'
  package_size: number
  promo_bonus_modules: number
  amount_minor: number
  amount_currency: 'RUB' | 'EUR'
  payment_method: string | null
  provider_operation_id: string | null
  created_at: string
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: row } = await supabase
    .from('payments')
    .select(
      'id, status, package_size, promo_bonus_modules, amount_minor, amount_currency, payment_method, provider_operation_id, created_at',
    )
    .eq('order_id', params.orderId)
    .eq('user_id', user.id)
    .maybeSingle<PaymentRow>()

  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  let current = row
  if (current.status === 'pending') {
    current = (await maybePollProvider(current)) ?? current
  }

  const modulesCredited =
    current.status === 'approved'
      ? (current.package_size ?? 0) + (current.promo_bonus_modules ?? 0)
      : null

  return NextResponse.json({
    status: current.status,
    modulesCredited,
    amountMinor: current.amount_minor,
    currency: current.amount_currency,
    paymentMethod: current.payment_method,
  })
}

/**
 * Calls `GET /payments/{operationId}` if the row has been pending past the
 * grace window. On `APPROVED` triggers the same idempotent RPC the webhook
 * uses; on `EXPIRED` / `CANCELED` flips the row to `expired`. Returns the
 * fresh row state if anything changed; otherwise null (caller keeps the
 * already-loaded value).
 */
async function maybePollProvider(row: PaymentRow): Promise<PaymentRow | null> {
  if (!row.provider_operation_id) return null
  const ageMs = Date.now() - new Date(row.created_at).getTime()
  if (ageMs < POLLING_GRACE_MS) return null

  let info: Awaited<ReturnType<typeof getPaymentInfo>>
  try {
    info = await getPaymentInfo(row.provider_operation_id)
  } catch (err) {
    if (err instanceof TochkaApiError && err.httpStatus === 404) {
      console.warn('[payments/status] provider 404 — operation missing', {
        operationId: row.provider_operation_id,
      })
      return null
    }
    if (err instanceof TochkaServerError) {
      console.warn('[payments/status] provider 5xx during poll', err.body)
      return null
    }
    console.error('[payments/status] poll failed', err)
    return null
  }

  const providerStatus = info.status
  const admin = createAdminClient()

  if (providerStatus === 'APPROVED' || providerStatus === 'AUTHORIZED') {
    const { error } = await admin.rpc('approve_payment_atomic', {
      p_provider_operation_id: row.provider_operation_id,
      p_payment_method: info.paymentType ?? row.payment_method ?? 'card',
    })
    if (error && !error.message?.includes('payment_not_found')) {
      console.error('[payments/status] approve_payment_atomic failed', error)
      return null
    }
  } else if (providerStatus === 'EXPIRED' || providerStatus === 'CANCELED') {
    await admin
      .from('payments')
      .update({
        status: 'expired',
        status_updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('status', 'pending')
  } else {
    return null
  }

  const { data: refreshed } = await admin
    .from('payments')
    .select(
      'id, status, package_size, promo_bonus_modules, amount_minor, amount_currency, payment_method, provider_operation_id, created_at',
    )
    .eq('id', row.id)
    .maybeSingle<PaymentRow>()
  return refreshed ?? null
}
