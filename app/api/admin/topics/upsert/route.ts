import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { invalidateTopicCache } from '@/lib/topic-sampler'

const ALLOWED_MODULES = ['lesen', 'horen', 'schreiben', 'sprechen'] as const
const ALLOWED_LEVELS = ['a1', 'a2', 'b1'] as const

interface Body {
  id?: string
  module?: string
  level?: string
  teil?: number | null
  is_active?: boolean
  topic_data?: unknown
}

export async function POST(req: NextRequest) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const moduleName = body.module as (typeof ALLOWED_MODULES)[number] | undefined
  const level = body.level as (typeof ALLOWED_LEVELS)[number] | undefined

  if (!moduleName || !ALLOWED_MODULES.includes(moduleName)) {
    return NextResponse.json({ error: 'module должен быть lesen/horen/schreiben/sprechen' }, { status: 400 })
  }
  if (!level || !ALLOWED_LEVELS.includes(level)) {
    return NextResponse.json({ error: 'level должен быть a1/a2/b1' }, { status: 400 })
  }

  const needsTeil = moduleName === 'lesen' || moduleName === 'horen'
  const teil = body.teil ?? null
  if (needsTeil) {
    const max = moduleName === 'lesen' ? 5 : 4
    if (!Number.isInteger(teil) || (teil as number) < 1 || (teil as number) > max) {
      return NextResponse.json(
        { error: `teil для ${moduleName} должен быть 1..${max}` },
        { status: 400 }
      )
    }
  } else if (teil !== null) {
    return NextResponse.json(
      { error: `teil для ${moduleName} должен быть null` },
      { status: 400 }
    )
  }

  if (!body.topic_data || typeof body.topic_data !== 'object' || Array.isArray(body.topic_data)) {
    return NextResponse.json({ error: 'topic_data должен быть JSON-объектом' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const isActive = body.is_active ?? true
  const now = new Date().toISOString()

  if (body.id) {
    const { error } = await supabase
      .from('generation_topics')
      .update({
        module: moduleName,
        level,
        teil,
        topic_data: body.topic_data,
        is_active: isActive,
        updated_at: now,
      })
      .eq('id', body.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('generation_topics').insert({
      module: moduleName,
      level,
      teil,
      topic_data: body.topic_data,
      is_active: isActive,
      created_by: adminOrResp.id,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  invalidateTopicCache({ module: moduleName, level, teil: teil ?? undefined })

  return NextResponse.json({ ok: true })
}
