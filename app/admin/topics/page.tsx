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
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Темы генерации</h1>
        <p className="text-sm text-[#6B6560] mt-1">
          Sampler случайно выбирает активную тему на каждую генерацию. Минимум 3 темы на связку
          <span className="font-mono"> module/level/teil</span>, иначе экзамены будут повторяться.
        </p>
      </header>

      <TopicsManager initialTopics={topics} filters={searchParams} />
    </div>
  )
}
