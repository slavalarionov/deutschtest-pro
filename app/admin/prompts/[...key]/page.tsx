import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminPage } from '@/lib/admin/require-admin'
import { PromptEditor } from './prompt-editor'

export const dynamic = 'force-dynamic'

interface PromptVersion {
  id: number
  prompt_key: string
  version: number
  content: string
  change_note: string | null
  changed_by: string | null
  created_at: string
}

interface PageProps {
  params: { key: string[] }
}

async function loadPrompt(key: string) {
  const supabase = createAdminClient()

  const { data: prompt } = await supabase
    .from('prompts')
    .select('key, category, description, active_version_id, updated_at')
    .eq('key', key)
    .maybeSingle()

  if (!prompt) return null

  const { data: versions } = await supabase
    .from('prompt_versions')
    .select('id, prompt_key, version, content, change_note, changed_by, created_at')
    .eq('prompt_key', key)
    .order('version', { ascending: false })

  // Резолвим email для changed_by (если есть)
  const changerIds = Array.from(
    new Set((versions ?? []).map((v) => v.changed_by).filter((x): x is string => !!x))
  )
  const emailsByUserId = new Map<string, string>()
  if (changerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', changerIds)
    for (const p of profiles ?? []) emailsByUserId.set(p.id, p.email)
  }

  return {
    prompt,
    versions: (versions ?? []) as PromptVersion[],
    emailsByUserId,
  }
}

export default async function AdminPromptEditorPage({ params }: PageProps) {
  await requireAdminPage('/admin/prompts')

  const key = params.key.join('/')
  const data = await loadPrompt(key)
  if (!data) notFound()

  const { prompt, versions, emailsByUserId } = data
  const activeVersion = versions.find((v) => v.id === prompt.active_version_id) ?? versions[0]

  return (
    <div className="max-w-6xl">
      <header className="mb-6">
        <Link href="/admin/prompts" className="text-xs text-[#6B6560] hover:text-[#1A1A1A]">
          ← Все промпты
        </Link>
        <h1 className="text-2xl font-bold text-[#1A1A1A] mt-2 font-mono">{prompt.key}</h1>
        {prompt.description && (
          <p className="text-sm text-[#6B6560] mt-1">{prompt.description}</p>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PromptEditor
            promptKey={prompt.key}
            initialContent={activeVersion?.content ?? ''}
            currentVersion={activeVersion?.version ?? 0}
          />
        </div>

        <aside className="space-y-3">
          <h2 className="text-sm uppercase tracking-wide text-[#6B6560]">История версий</h2>
          <ul className="space-y-2">
            {versions.map((v) => {
              const isActive = v.id === prompt.active_version_id
              const email = v.changed_by ? emailsByUserId.get(v.changed_by) : null
              return (
                <li
                  key={v.id}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    isActive
                      ? 'border-[#C8A84B] bg-[#FAF6E8]'
                      : 'border-[#E0DDD6] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      v{v.version}
                      {isActive && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-[#C8A84B]">
                          активная
                        </span>
                      )}
                    </span>
                    {!isActive && <RollbackButton promptKey={prompt.key} versionId={v.id} />}
                  </div>
                  <div className="text-xs text-[#6B6560] mt-1">
                    {new Date(v.created_at).toLocaleString('ru-RU')}
                    {email && ` · ${email}`}
                  </div>
                  {v.change_note && (
                    <div className="text-xs text-[#1A1A1A] mt-1">{v.change_note}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </aside>
      </div>
    </div>
  )
}

function RollbackButton({ promptKey, versionId }: { promptKey: string; versionId: number }) {
  // Client part lives in prompt-editor.tsx (RollbackControl) — тут серверно рендерим форму с action.
  // Простой подход: маленькая HTML-форма, POST на API. JS нам не нужен для отката.
  return (
    <form
      action="/api/admin/prompts/rollback"
      method="post"
    >
      <input type="hidden" name="key" value={promptKey} />
      <input type="hidden" name="version_id" value={versionId} />
      <button
        type="submit"
        className="text-xs text-[#C8A84B] hover:text-[#1A1A1A]"
      >
        Откатить
      </button>
    </form>
  )
}
