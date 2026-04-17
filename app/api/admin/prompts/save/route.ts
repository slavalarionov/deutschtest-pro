import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { invalidatePromptCache } from '@/lib/prompt-store'

interface SaveBody {
  key?: string
  content?: string
  change_note?: string
}

export async function POST(req: NextRequest) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  let body: SaveBody
  try {
    body = (await req.json()) as SaveBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const key = body.key?.trim()
  const content = body.content
  const changeNote = body.change_note?.trim()

  if (!key) return NextResponse.json({ error: 'key обязателен' }, { status: 400 })
  if (typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'content пуст' }, { status: 400 })
  }
  if (!changeNote) {
    return NextResponse.json({ error: 'change_note обязателен' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: promptRow, error: promptErr } = await supabase
    .from('prompts')
    .select('key, active_version_id')
    .eq('key', key)
    .maybeSingle()

  if (promptErr) return NextResponse.json({ error: promptErr.message }, { status: 500 })
  if (!promptRow) return NextResponse.json({ error: 'prompt not found' }, { status: 404 })

  const { data: maxRow, error: maxErr } = await supabase
    .from('prompt_versions')
    .select('version')
    .eq('prompt_key', key)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (maxErr) return NextResponse.json({ error: maxErr.message }, { status: 500 })

  const nextVersion = (maxRow?.version ?? 0) + 1

  const { data: inserted, error: insertErr } = await supabase
    .from('prompt_versions')
    .insert({
      prompt_key: key,
      version: nextVersion,
      content,
      change_note: changeNote,
      changed_by: adminOrResp.id,
    })
    .select('id, version')
    .single()

  if (insertErr || !inserted) {
    return NextResponse.json({ error: insertErr?.message ?? 'insert failed' }, { status: 500 })
  }

  const { error: updateErr } = await supabase
    .from('prompts')
    .update({
      active_version_id: inserted.id,
      updated_at: new Date().toISOString(),
    })
    .eq('key', key)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  invalidatePromptCache(key)

  return NextResponse.json({
    ok: true,
    version_id: inserted.id,
    version: inserted.version,
  })
}
