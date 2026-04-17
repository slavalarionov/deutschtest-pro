import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { invalidateTopicCache, type ExamLevelLower, type ModuleName } from '@/lib/topic-sampler'

interface Body {
  is_active?: boolean
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  const id = params.id?.trim()
  if (!id) return NextResponse.json({ error: 'id обязателен' }, { status: 400 })

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.is_active !== 'boolean') {
    return NextResponse.json({ error: 'is_active обязателен (boolean)' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: row, error: fetchErr } = await supabase
    .from('generation_topics')
    .select('module, level, teil')
    .eq('id', id)
    .maybeSingle()

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!row) return NextResponse.json({ error: 'не найдено' }, { status: 404 })

  const { error } = await supabase
    .from('generation_topics')
    .update({ is_active: body.is_active, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  invalidateTopicCache({
    module: row.module as ModuleName,
    level: row.level as ExamLevelLower,
    teil: row.teil ?? undefined,
  })

  return NextResponse.json({ ok: true })
}
