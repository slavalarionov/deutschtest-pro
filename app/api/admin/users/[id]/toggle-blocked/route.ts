/**
 * POST /api/admin/users/[id]/toggle-blocked
 * Body: { value: boolean }
 *
 * Safety-rail: админа заблокировать нельзя — сначала надо снять admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'

interface Body {
  value?: boolean
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

  if (typeof body.value !== 'boolean') {
    return NextResponse.json({ error: 'value must be boolean' }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (body.value === true) {
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .select('id, is_admin')
      .eq('id', params.id)
      .maybeSingle()

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
    if (!profile) return NextResponse.json({ error: 'user not found' }, { status: 404 })

    if ((profile as { is_admin: boolean }).is_admin) {
      return NextResponse.json(
        { error: 'Нельзя заблокировать админа — сначала снимите флаг admin.' },
        { status: 403 }
      )
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_blocked: body.value })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
