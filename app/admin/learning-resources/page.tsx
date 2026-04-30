import { requireAdminPage } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { ResourcesManager, type ResourceRow } from './resources-manager'

export const dynamic = 'force-dynamic'

interface SearchParams {
  module?: string
  level?: string
  topic?: string
  language?: string
  active?: string
  type?: string
  page?: string
}

const PAGE_SIZE = 50

export default async function AdminLearningResourcesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAdminPage('/admin/learning-resources')

  const supabase = createAdminClient()
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('learning_resources')
    .select(
      'id, module, level, topic, title, url, resource_type, description, language, is_active, body, created_at, updated_at',
      { count: 'exact' },
    )
    .order('updated_at', { ascending: false })
    .range(from, to)

  if (searchParams.module) query = query.eq('module', searchParams.module)
  if (searchParams.level) query = query.eq('level', searchParams.level)
  if (searchParams.topic) query = query.eq('topic', searchParams.topic)
  if (searchParams.language) query = query.eq('language', searchParams.language)
  if (searchParams.active === '1') query = query.eq('is_active', true)
  else if (searchParams.active === '0') query = query.eq('is_active', false)
  if (searchParams.type === 'advice') query = query.eq('resource_type', 'advice')
  else if (searchParams.type === 'external') query = query.neq('resource_type', 'advice')

  const { data: rows, count } = await query
  const resources = (rows ?? []) as ResourceRow[]
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <div className="max-w-6xl">
      <header className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Admin · learning resources
        </div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          Учебные ресурсы.
          <br />
          <span className="text-ink-soft">Курируемая база ссылок для рекомендаций.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          ИИ классифицирует слабые зоны через закрытый набор тегов; сервер подбирает ресурсы из этой
          таблицы. Битые ссылки лучше деактивировать, а не удалять — на них могут ссылаться
          существующие снапшоты в <code className="font-mono text-xs text-ink">user_recommendations</code>.
        </p>
      </header>

      <ResourcesManager
        initialRows={resources}
        filters={searchParams}
        page={page}
        totalPages={totalPages}
        totalCount={count ?? 0}
      />
    </div>
  )
}
