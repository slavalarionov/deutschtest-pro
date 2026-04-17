import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { invalidatePromptCache } from '@/lib/prompt-store'

// Принимает form-encoded POST из HTML формы.
// Поля: key (string), version_id (number).
// После успешного отката редиректит на /admin/prompts/<key>.
export async function POST(req: NextRequest) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  const form = await req.formData()
  const key = String(form.get('key') ?? '').trim()
  const versionIdRaw = String(form.get('version_id') ?? '').trim()
  const versionId = Number(versionIdRaw)

  if (!key || !Number.isFinite(versionId) || versionId <= 0) {
    return NextResponse.json({ error: 'key и version_id обязательны' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: version, error: versionErr } = await supabase
    .from('prompt_versions')
    .select('id, prompt_key')
    .eq('id', versionId)
    .maybeSingle()

  if (versionErr) return NextResponse.json({ error: versionErr.message }, { status: 500 })
  if (!version || version.prompt_key !== key) {
    return NextResponse.json({ error: 'version не принадлежит этому prompt' }, { status: 400 })
  }

  const { error: updateErr } = await supabase
    .from('prompts')
    .update({
      active_version_id: versionId,
      updated_at: new Date().toISOString(),
    })
    .eq('key', key)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  invalidatePromptCache(key)

  const url = new URL(req.url)
  return NextResponse.redirect(new URL(`/admin/prompts/${key}`, url.origin), { status: 303 })
}
