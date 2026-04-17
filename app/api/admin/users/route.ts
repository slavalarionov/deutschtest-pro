/**
 * GET /api/admin/users — список юзеров с фильтрами.
 *
 * Режимы:
 *   - По умолчанию (или ids_only=0): вернёт rows + total_matching + next_cursor (пагинация 50).
 *   - ids_only=1: вернёт только массив id (до limit, default 1000) — используется для
 *     «Выбрать всех по фильтру» в bulk-toolbar. Намеренно НЕ грузит тяжёлые поля.
 *
 * Использует тот же parseFilters + applyFilters, что и SSR-страница, чтобы поведение
 * фильтров было идентичным.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  DEFAULT_PAGE_SIZE,
  applyUserFilters,
  parseFilters,
} from '@/lib/admin/user-filters'

export async function GET(req: NextRequest) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  const { searchParams } = new URL(req.url)
  const raw: Record<string, string | undefined> = {}
  searchParams.forEach((v, k) => {
    raw[k] = v
  })
  const filters = parseFilters(raw)
  const idsOnly = searchParams.get('ids_only') === '1'

  const supabase = createAdminClient()

  if (idsOnly) {
    const limitRaw = Number(searchParams.get('limit') ?? '1000')
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 5000) : 1000

    let idsQ = supabase.from('profiles').select('id').order('created_at', { ascending: false }).limit(limit)
    idsQ = applyUserFilters(idsQ, filters)
    if (filters.cursor) {
      idsQ = idsQ.lt('created_at', filters.cursor)
    }
    const { data, error } = await idsQ
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const ids = (data ?? []).map((r) => (r as { id: string }).id)
    return NextResponse.json({ ids, total: ids.length })
  }

  // Полная страница (как в SSR).
  let countQ = supabase.from('profiles').select('id', { count: 'exact', head: true })
  countQ = applyUserFilters(countQ, filters)
  const { count: totalMatching, error: countErr } = await countQ
  if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 })

  let pageQ = supabase
    .from('profiles')
    .select('id, email, display_name, created_at, modules_balance, is_admin, is_unlimited, is_blocked')
  pageQ = applyUserFilters(pageQ, filters)
  if (filters.cursor) {
    pageQ = pageQ.lt('created_at', filters.cursor)
  }

  const { data: profileRows, error: pageErr } = await pageQ
    .order('created_at', { ascending: false })
    .limit(DEFAULT_PAGE_SIZE + 1)

  if (pageErr) return NextResponse.json({ error: pageErr.message }, { status: 500 })

  const profiles = (profileRows ?? []) as Array<{
    id: string
    email: string
    display_name: string | null
    created_at: string
    modules_balance: number
    is_admin: boolean
    is_unlimited: boolean | null
    is_blocked: boolean | null
  }>

  const hasMore = profiles.length > DEFAULT_PAGE_SIZE
  const page = hasMore ? profiles.slice(0, DEFAULT_PAGE_SIZE) : profiles
  const nextCursor = hasMore ? page[page.length - 1].created_at : null

  return NextResponse.json({
    rows: page,
    total_matching: totalMatching ?? 0,
    next_cursor: nextCursor,
  })
}
