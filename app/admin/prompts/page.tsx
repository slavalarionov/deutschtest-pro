import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminPage } from '@/lib/admin/require-admin'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface PromptRow {
  key: string
  category: string
  description: string | null
  active_version_id: number | null
  updated_at: string | null
}

interface VersionMeta {
  id: number
  prompt_key: string
  version: number
  created_at: string
  change_note: string | null
}

async function loadPromptsWithVersion(): Promise<
  Array<PromptRow & { currentVersion?: VersionMeta | null }>
> {
  const supabase = createAdminClient()
  const { data: prompts, error } = await supabase
    .from('prompts')
    .select('key, category, description, active_version_id, updated_at')
    .order('key')

  if (error || !prompts) return []

  const activeIds = prompts
    .map((p) => p.active_version_id)
    .filter((id): id is number => typeof id === 'number')

  const versionsById = new Map<number, VersionMeta>()
  if (activeIds.length > 0) {
    const { data: versions } = await supabase
      .from('prompt_versions')
      .select('id, prompt_key, version, created_at, change_note')
      .in('id', activeIds)
    for (const v of versions ?? []) versionsById.set(v.id, v as VersionMeta)
  }

  return prompts.map((p) => ({
    ...p,
    currentVersion: p.active_version_id ? versionsById.get(p.active_version_id) ?? null : null,
  }))
}

export default async function AdminPromptsPage() {
  await requireAdminPage('/admin/prompts')
  const prompts = await loadPromptsWithVersion()

  const generation = prompts.filter((p) => p.category === 'generation')
  const scoring = prompts.filter((p) => p.category === 'scoring')

  return (
    <div className="max-w-5xl">
      <header className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Admin · prompts
        </div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          Промпты.
          <br />
          <span className="text-ink-soft">Единственный источник правды.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Активная версия каждого ключа — то, что крутится на проде. Изменения
          подхватываются через 60 секунд (TTL кеша).
        </p>
      </header>

      <PromptTable title="Генерация" rows={generation} />
      <PromptTable title="Скоринг" rows={scoring} />
    </div>
  )
}

function PromptTable({
  title,
  rows,
}: {
  title: string
  rows: Array<PromptRow & { currentVersion?: VersionMeta | null }>
}) {
  if (rows.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          {title}
        </h2>
        <p className="text-sm text-ink-soft">
          Промпты этой категории ещё не засеяны. Прогони{' '}
          <code className="rounded-rad-sm border border-line bg-surface px-1.5 py-0.5 font-mono text-xs">
            npx tsx scripts/seed-prompts.ts
          </code>
          .
        </p>
      </section>
    )
  }

  return (
    <section className="mb-10">
      <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
        {title}
      </h2>
      <div className="overflow-hidden rounded-rad border border-line bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line bg-surface font-mono text-[10px] uppercase tracking-widest text-muted">
              <tr>
                <th className="px-5 py-3 text-left font-normal">Ключ</th>
                <th className="px-5 py-3 text-left font-normal">Описание</th>
                <th className="w-24 px-5 py-3 text-left font-normal">Версия</th>
                <th className="w-44 px-5 py-3 text-left font-normal">Обновлено</th>
                <th className="w-32 px-5 py-3 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const href = `/admin/prompts/${row.key}`
                return (
                  <tr key={row.key} className="border-b border-line-soft last:border-0">
                    <td className="px-5 py-3 font-mono text-xs text-ink">{row.key}</td>
                    <td className="px-5 py-3 text-ink-soft">{row.description ?? '—'}</td>
                    <td className="px-5 py-3 font-mono text-sm tabular-nums text-ink">
                      {row.currentVersion ? `v${row.currentVersion.version}` : '—'}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs tabular-nums text-muted">
                      {row.updated_at ? new Date(row.updated_at).toLocaleString('ru-RU') : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={href}
                        className="text-xs text-ink-soft underline underline-offset-4 hover:text-ink"
                      >
                        Редактировать
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
