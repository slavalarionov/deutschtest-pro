import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { LEARNING_TAGS } from '@/lib/learning-tags'

const bodySchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  url: z.string().url().regex(/^https?:\/\//i, 'URL must start with http:// or https://'),
  module: z.enum(['lesen', 'horen', 'schreiben', 'sprechen']),
  level: z.enum(['a1', 'a2', 'b1']),
  topic: z.enum(LEARNING_TAGS),
  resource_type: z.enum(['book', 'video', 'exercise', 'website', 'app', 'article']),
  description: z.string().trim().max(500).nullable().optional(),
  language: z.enum(['de', 'ru', 'en']),
  is_active: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid body' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const data = parsed.data

  if (data.id) {
    const { error } = await supabase
      .from('learning_resources')
      .update({
        title: data.title,
        url: data.url,
        module: data.module,
        level: data.level,
        topic: data.topic,
        resource_type: data.resource_type,
        description: data.description ?? null,
        language: data.language,
        is_active: data.is_active ?? true,
      })
      .eq('id', data.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('learning_resources').insert({
      title: data.title,
      url: data.url,
      module: data.module,
      level: data.level,
      topic: data.topic,
      resource_type: data.resource_type,
      description: data.description ?? null,
      language: data.language,
      is_active: data.is_active ?? true,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
