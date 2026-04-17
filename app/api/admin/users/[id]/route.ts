/**
 * DELETE /api/admin/users/[id]
 *
 * Хард-делит пользователя с аудит-снимком.
 * Safety-rails:
 *   - no-self-delete: админ не может удалить сам себя;
 *   - no-admin-delete: нельзя удалить админа (сначала снять is_admin).
 *
 * Тело опц.: { note?: string } — попадает в deleted_users_audit.note.
 *
 * Каскады выполняются через auth.admin.deleteUser и FK ON DELETE CASCADE,
 * настроенные в миграциях 001 (profiles), 015 (exam_sessions, user_attempts)
 * и 009 (modules_ledger, promo_redemptions).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteUserWithAudit } from '@/lib/admin/delete-user'

interface Body {
  note?: string
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  let body: Body = {}
  try {
    body = (await req.json()) as Body
  } catch {
    // Body опционален — пропускаем.
  }

  if (adminOrResp.id === params.id) {
    return NextResponse.json({ error: 'Нельзя удалить самого себя.' }, { status: 403 })
  }

  const supabase = createAdminClient()

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('id', params.id)
    .maybeSingle()

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  if (!profile) return NextResponse.json({ error: 'user not found' }, { status: 404 })
  if ((profile as { is_admin: boolean }).is_admin) {
    return NextResponse.json(
      { error: 'Нельзя удалить админа — сначала снимите флаг admin.' },
      { status: 403 }
    )
  }

  const reason = await deleteUserWithAudit(
    supabase,
    params.id,
    adminOrResp.id,
    body.note?.trim() || undefined
  )

  if (reason) {
    return NextResponse.json({ error: reason }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
