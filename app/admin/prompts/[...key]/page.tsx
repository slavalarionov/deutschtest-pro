import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminPage } from '@/lib/admin/require-admin'
import { StatusChip } from '@/components/admin/StatusChip'
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
      <div className="mb-6">
        <Link
          href="/admin/prompts"
          className="text-sm text-ink-soft transition-colors hover:text-ink"
        >
          Все промпты
        </Link>
      </div>

      <header className="mb-8">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Prompt
        </div>
        <h1 className="mt-2 break-all font-mono text-2xl tracking-tight text-ink">
          {prompt.key}
        </h1>
        {prompt.description && (
          <p className="mt-3 max-w-2xl text-sm text-ink-soft">{prompt.description}</p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PromptEditor
            promptKey={prompt.key}
            initialContent={activeVersion?.content ?? ''}
            currentVersion={activeVersion?.version ?? 0}
          />
        </div>

        <aside className="space-y-3">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted">
            История версий
          </h2>
          <ul className="space-y-2">
            {versions.map((v) => {
              const isActive = v.id === prompt.active_version_id
              const email = v.changed_by ? emailsByUserId.get(v.changed_by) : null
              return (
                <li
                  key={v.id}
                  className={`rounded-rad-sm border px-4 py-3 text-sm ${
                    isActive
                      ? 'border-line bg-accent-soft'
                      : 'border-line bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm tabular-nums text-ink">
                        v{v.version}
                      </span>
                      {isActive && <StatusChip variant="active">активная</StatusChip>}
                    </span>
                    {!isActive && <RollbackButton promptKey={prompt.key} versionId={v.id} />}
                  </div>
                  <div className="mt-2 font-mono text-xs tabular-nums text-muted">
                    {new Date(v.created_at).toLocaleString('ru-RU')}
                    {email && <span className="ml-2 normal-case">· {email}</span>}
                  </div>
                  {v.change_note && (
                    <div className="mt-2 text-sm text-ink-soft">{v.change_note}</div>
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
  // Server-rendered HTML form — JS not needed for rollback.
  return (
    <form action="/api/admin/prompts/rollback" method="post">
      <input type="hidden" name="key" value={promptKey} />
      <input type="hidden" name="version_id" value={versionId} />
      <button
        type="submit"
        className="font-mono text-[10px] uppercase tracking-wider text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
      >
        Откатить
      </button>
    </form>
  )
}
