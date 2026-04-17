/**
 * POST /api/admin/users/bulk-delete
 * Body: { user_ids: string[], note?: string }
 *
 * Safety-rails (server-side, клиент уже фильтрует для UX):
 *   - лимит 100 id за вызов;
 *   - no-self-delete: текущий админ пропускается;
 *   - no-admin-delete: если у цели is_admin = true — пропускаем (reason: 'target is admin');
 *   - для каждой цели: audit snapshot → auth.admin.deleteUser (каскад FK).
 *
 * Возвращает { deleted: N, skipped: [{id, reason}] } — клиент показывает сводку.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteUserWithAudit } from '@/lib/admin/delete-user'

interface Body {
  user_ids?: string[]
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

  const ids = Array.isArray(body.user_ids)
    ? body.user_ids.filter((x): x is string => typeof x === 'string')
    : []

  if (ids.length === 0) return NextResponse.json({ error: 'user_ids required' }, { status: 400 })
  if (ids.length > BULK_LIMIT) {
    return NextResponse.json(
      { error: `Лимит bulk-delete: ${BULK_LIMIT} юзеров за раз. Получено ${ids.length}.` },
      { status: 400 }
    )
  }

  const supabase = createAdminClient()

  // Фильтруем админов и самого себя.
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .in('id', ids)

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const adminIds = new Set<string>()
  const knownIds = new Set<string>()
  for (const p of (profiles ?? []) as Array<{ id: string; is_admin: boolean }>) {
    knownIds.add(p.id)
    if (p.is_admin) adminIds.add(p.id)
  }

  const skipped: Array<{ id: string; reason: string }> = []
  let deleted = 0

  for (const id of ids) {
    if (id === adminOrResp.id) {
      skipped.push({ id, reason: 'cannot delete self' })
      continue
    }
    if (adminIds.has(id)) {
      skipped.push({ id, reason: 'target is admin' })
      continue
    }
    if (!knownIds.has(id)) {
      skipped.push({ id, reason: 'profile not found' })
      continue
    }

    const reason = await deleteUserWithAudit(
      supabase,
      id,
      adminOrResp.id,
      body.note?.trim() || 'bulk_delete'
    )
    if (reason) {
      skipped.push({ id, reason })
      continue
    }
    deleted++
  }

  return NextResponse.json({ deleted, skipped })
}
