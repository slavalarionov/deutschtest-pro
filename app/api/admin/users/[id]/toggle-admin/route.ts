/**
 * POST /api/admin/users/[id]/toggle-admin
 * Body: { value: boolean }
 *
 * Safety-rails:
 *   - nо-self-demote: админ не может снять флаг у себя;
 *   - no-last-admin: нельзя снять флаг у единственного админа в системе.
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

  // Safety-rails: демотинг админа.
  if (body.value === false) {
    if (adminOrResp.id === params.id) {
      return NextResponse.json(
        { error: 'Нельзя снять admin у самого себя.' },
        { status: 403 }
      )
    }

    const { count, error: countErr } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_admin', true)

    if (countErr) return NextResponse.json({ error: countErr.message }, { status: 500 })
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Нельзя снять флаг — это единственный админ.' },
        { status: 403 }
      )
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: body.value })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
