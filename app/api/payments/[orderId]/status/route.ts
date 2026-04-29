/**
 * GET /api/payments/[orderId]/status
 *
 * Auth: required. Returns 404 if the order does not belong to the current user
 * (so we don't leak existence of other users' orders).
 *
 * Used by the success page client component to poll until status flips
 * from `pending` to `approved`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
    .select('status, package_size, promo_bonus_modules, amount_minor, amount_currency, payment_method')
    .eq('order_id', params.orderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const modulesCredited =
    row.status === 'approved'
      ? (row.package_size ?? 0) + (row.promo_bonus_modules ?? 0)
      : null

  return NextResponse.json({
    status: row.status,
    modulesCredited,
    amountMinor: row.amount_minor,
    currency: row.amount_currency,
    paymentMethod: row.payment_method,
  })
}
