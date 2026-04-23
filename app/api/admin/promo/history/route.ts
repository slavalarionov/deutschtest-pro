/**
 * GET /api/admin/promo/history?id=<uuid>
 *
 * Возвращает список активаций промокода. Для каждой активации — email юзера,
 * дата, сколько модулей начислено. Сортировка: новые сверху.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'

interface RedemptionDbRow {
  redeemed_at: string | null
  modules_granted: number
  user_id: string
}

interface ProfileIdEmail {
  id: string
  email: string | null
}

export async function GET(req: NextRequest) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createAdminClient()

  const { data: redemptions, error: rErr } = await supabase
    .from('promo_redemptions')
    .select('redeemed_at, modules_granted, user_id')
    .eq('promo_id', id)
    .order('redeemed_at', { ascending: false })

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  const rows = (redemptions ?? []) as RedemptionDbRow[]
  if (rows.length === 0) {
    return NextResponse.json({ redemptions: [] })
  }

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', userIds)

  const emailById = new Map<string, string | null>()
  for (const p of (profiles ?? []) as ProfileIdEmail[]) {
    emailById.set(p.id, p.email)
  }

  return NextResponse.json({
    redemptions: rows.map((r) => ({
      redeemedAt: r.redeemed_at,
      modulesGranted: r.modules_granted,
      userEmail: emailById.get(r.user_id) ?? null,
    })),
  })
}
