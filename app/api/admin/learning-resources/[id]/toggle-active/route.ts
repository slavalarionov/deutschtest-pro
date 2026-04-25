import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'

const bodySchema = z.object({ is_active: z.boolean() })

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('learning_resources')
    .update({ is_active: parsed.data.is_active })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
