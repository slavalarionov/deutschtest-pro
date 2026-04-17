/**
 * POST /api/admin/users/bulk-grant-modules
 * Body: { user_ids: string[], count: int > 0, reason: string, note?: string }
 *
 * Лимит: 100 user_ids за вызов. Безопаснее звать несколько раз, чем резать транзакцию
 * на полмиллиарда записей. Каждому юзеру делается отдельный UPDATE + INSERT ledger.
 *
 * Возвращает { granted: N, failed: [{id, error}] } — клиент показывает сводку.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'

interface Body {
  user_ids?: string[]
  count?: number
  reason?: string
  note?: string
}

const BULK_LIMIT = 100

export async function POST(req: NextRequest) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const ids = Array.isArray(body.user_ids) ? body.user_ids.filter((x): x is string => typeof x === 'string') : []
  const count = body.count
  const reason = body.reason?.trim()

  if (ids.length === 0) return NextResponse.json({ error: 'user_ids required' }, { status: 400 })
  if (ids.length > BULK_LIMIT) {
    return NextResponse.json(
      { error: `Лимит bulk-grant: ${BULK_LIMIT} юзеров за раз. Получено ${ids.length}.` },
      { status: 400 }
    )
  }
  if (typeof count !== 'number' || !Number.isInteger(count) || count <= 0) {
    return NextResponse.json({ error: 'count must be positive integer' }, { status: 400 })
  }
  if (!reason) return NextResponse.json({ error: 'reason required' }, { status: 400 })

  const supabase = createAdminClient()

  // Подгружаем текущие балансы одним запросом.
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, modules_balance')
    .in('id', ids)

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const balances = new Map<string, number>()
  for (const p of (profiles ?? []) as Array<{ id: string; modules_balance: number }>) {
    balances.set(p.id, p.modules_balance ?? 0)
  }

  const failed: Array<{ id: string; error: string }> = []
  let granted = 0

  for (const id of ids) {
    const current = balances.get(id)
    if (current === undefined) {
      failed.push({ id, error: 'profile not found' })
      continue
    }
    const { error: upErr } = await supabase
      .from('profiles')
      .update({ modules_balance: current + count })
      .eq('id', id)
    if (upErr) {
      failed.push({ id, error: upErr.message })
      continue
    }
    const { error: ledgerErr } = await supabase.from('modules_ledger').insert({
      user_id: id,
      delta: count,
      reason,
      note: body.note?.trim() || null,
      performed_by: adminOrResp.id,
    })
    if (ledgerErr) {
      // Баланс обновлён, но ledger не записан — помечаем как partial.
      failed.push({ id, error: `ledger: ${ledgerErr.message}` })
      continue
    }
    granted++
  }

  return NextResponse.json({ granted, failed })
}
