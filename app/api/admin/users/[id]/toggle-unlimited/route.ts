/**
 * POST /api/admin/users/[id]/toggle-unlimited
 * Body: { value: boolean }
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
  const { error } = await supabase
    .from('profiles')
    .update({ is_unlimited: body.value })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
