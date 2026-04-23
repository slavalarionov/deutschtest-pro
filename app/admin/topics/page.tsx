import { requireAdminPage } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { TopicsManager, type TopicRow } from './topics-manager'

export const dynamic = 'force-dynamic'

interface SearchParams {
  module?: string
  level?: string
  teil?: string
  active?: string
}

export default async function AdminTopicsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireAdminPage('/admin/topics')

  const supabase = createAdminClient()

  let query = supabase
    .from('generation_topics')
    .select('id, module, level, teil, topic_data, is_active, created_at, updated_at')
    .order('module')
    .order('level')
    .order('teil', { nullsFirst: true })
    .order('created_at', { ascending: false })

  if (searchParams.module) query = query.eq('module', searchParams.module)
  if (searchParams.level) query = query.eq('level', searchParams.level)
  if (searchParams.teil === 'null') query = query.is('teil', null)
  else if (searchParams.teil) query = query.eq('teil', Number(searchParams.teil))
  if (searchParams.active === '1') query = query.eq('is_active', true)
  else if (searchParams.active === '0') query = query.eq('is_active', false)

  const { data: rows } = await query
  const topics = (rows ?? []) as TopicRow[]

  return (
    <div className="max-w-6xl">
      <header className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Admin · topics
        </div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          Темы генерации.
          <br />
          <span className="text-ink-soft">Sampler вытягивает случайную.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">
          Минимум 3 темы на связку{' '}
          <code className="font-mono text-xs text-ink">module/level/teil</code>, иначе экзамены
          начнут повторяться.
        </p>
      </header>

      <TopicsManager initialTopics={topics} filters={searchParams} />
    </div>
  )
}
