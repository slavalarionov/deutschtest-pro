/**
 * POST /api/admin/users/[id]/grant-modules
 * Body: { count: int > 0, reason: string, note?: string }
 *
 * Атомарно: читает текущий баланс, обновляет profiles.modules_balance += count,
 * пишет запись в modules_ledger. Нет транзакций в Supabase JS клиенте — делаем
 * последовательно, при ошибке ledger ничего не откатываем (в худшем случае
 * баланс начислен, но без следа — приемлемо, перепроверяется вручную).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'

interface Body {
  count?: number
  reason?: string
  note?: string
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const count = body.count
  const reason = body.reason?.trim()
  if (typeof count !== 'number' || !Number.isInteger(count) || count <= 0) {
    return NextResponse.json({ error: 'count must be positive integer' }, { status: 400 })
  }
  if (!reason) {
    return NextResponse.json({ error: 'reason required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, modules_balance')
    .eq('id', params.id)
    .maybeSingle()

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })
  if (!profile) return NextResponse.json({ error: 'user not found' }, { status: 404 })

  const current = (profile as { modules_balance: number }).modules_balance ?? 0
  const newBalance = current + count

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ modules_balance: newBalance })
    .eq('id', params.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  const { error: ledgerErr } = await supabase.from('modules_ledger').insert({
    user_id: params.id,
    delta: count,
    reason,
    note: body.note?.trim() || null,
    performed_by: adminOrResp.id,
  })

  if (ledgerErr) {
    // Баланс уже обновлён, но ledger не записался — сигнализируем клиенту.
    return NextResponse.json(
      { error: `balance updated, ledger write failed: ${ledgerErr.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, new_balance: newBalance })
}
