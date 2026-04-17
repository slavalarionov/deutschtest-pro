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
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Промпты</h1>
        <p className="text-sm text-[#6B6560] mt-1">
          Активная версия каждого ключа — единственный источник правды для генерации и скоринга.
          Изменения подхватываются на проде через 60 секунд (TTL кеша).
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
        <h2 className="text-sm uppercase tracking-wide text-[#6B6560] mb-2">{title}</h2>
        <p className="text-sm text-[#6B6560]">Промпты этой категории ещё не засеяны. Прогони <code className="bg-[#E0DDD6] px-1 rounded">npx tsx scripts/seed-prompts.ts</code>.</p>
      </section>
    )
  }

  return (
    <section className="mb-8">
      <h2 className="text-sm uppercase tracking-wide text-[#6B6560] mb-2">{title}</h2>
      <div className="overflow-hidden rounded-md border border-[#E0DDD6] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F2EFE8] text-left text-xs uppercase tracking-wide text-[#6B6560]">
              <th className="px-4 py-3 font-medium">Ключ</th>
              <th className="px-4 py-3 font-medium">Описание</th>
              <th className="px-4 py-3 font-medium w-24">Версия</th>
              <th className="px-4 py-3 font-medium w-44">Обновлено</th>
              <th className="px-4 py-3 font-medium w-24"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = `/admin/prompts/${row.key}`
              return (
                <tr key={row.key} className="border-t border-[#E0DDD6]">
                  <td className="px-4 py-3 font-mono text-xs">{row.key}</td>
                  <td className="px-4 py-3 text-[#1A1A1A]">{row.description ?? '—'}</td>
                  <td className="px-4 py-3 text-[#1A1A1A]">
                    {row.currentVersion ? `v${row.currentVersion.version}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-[#6B6560]">
                    {row.updated_at ? new Date(row.updated_at).toLocaleString('ru-RU') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={href}
                      className="text-[#C8A84B] hover:text-[#1A1A1A] text-xs font-medium"
                    >
                      Редактировать →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
