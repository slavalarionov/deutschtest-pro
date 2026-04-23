import { requireAdminPage } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { FeedbackList, type FeedbackRow, type FeedbackFilters } from './feedback-list'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 30

type RatingFilter = 'all' | 'low' | 'mid' | 'high'
type LevelFilter = 'all' | 'A1' | 'A2' | 'B1'
type ModuleFilter = 'all' | 'lesen' | 'horen' | 'schreiben' | 'sprechen'
type PeriodFilter = 'all' | 'today' | '7d' | '30d'

interface FeedbackDbRow {
  id: number
  user_id: string | null
  attempt_id: string | null
  rating: number | null
  message: string | null
  created_at: string | null
}

interface AttemptRow {
  id: string
  session_id: string | null
  level: string | null
}

interface SessionRow {
  id: string
  mode: string | null
}

interface ProfileRow {
  id: string
  email: string | null
}

function parseFilters(sp: Record<string, string | undefined>): FeedbackFilters {
  const rating = (sp.rating as RatingFilter) ?? 'all'
  const level = (sp.level as LevelFilter) ?? 'all'
  const module_ = (sp.module as ModuleFilter) ?? 'all'
  const period = (sp.period as PeriodFilter) ?? 'all'
  const pageRaw = Number(sp.page ?? '1')
  const page = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  return {
    rating: (['all', 'low', 'mid', 'high'] as const).includes(rating) ? rating : 'all',
    level: (['all', 'A1', 'A2', 'B1'] as const).includes(level) ? level : 'all',
    module: (['all', 'lesen', 'horen', 'schreiben', 'sprechen'] as const).includes(module_)
      ? module_
      : 'all',
    period: (['all', 'today', '7d', '30d'] as const).includes(period) ? period : 'all',
    page,
  }
}

function periodLowerBound(period: PeriodFilter): Date | null {
  if (period === 'all') return null
  if (period === 'today') {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  const days = period === '7d' ? 7 : 30
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

async function loadFeedbackPage(filters: FeedbackFilters): Promise<{
  rows: FeedbackRow[]
  totalMatching: number
  totalAll: number
}> {
  const supabase = createAdminClient()

  // Полное число фидбэков (для заголовка, без фильтров).
  const { count: totalAll } = await supabase
    .from('feedback')
    .select('id', { count: 'exact', head: true })

  // Rating + period фильтры применяем в БД: много меньше данных грузим в JS.
  let q = supabase
    .from('feedback')
    .select('id, user_id, attempt_id, rating, message, created_at')
    .order('created_at', { ascending: false })

  if (filters.rating === 'low') q = q.in('rating', [1, 2])
  else if (filters.rating === 'mid') q = q.eq('rating', 3)
  else if (filters.rating === 'high') q = q.in('rating', [4, 5])

  const lower = periodLowerBound(filters.period)
  if (lower) q = q.gte('created_at', lower.toISOString())

  const { data: feedbackData } = await q
  const feedbackRows = (feedbackData ?? []) as FeedbackDbRow[]

  const attemptIds = Array.from(
    new Set(feedbackRows.map((r) => r.attempt_id).filter((v): v is string => Boolean(v))),
  )
  const userIds = Array.from(
    new Set(feedbackRows.map((r) => r.user_id).filter((v): v is string => Boolean(v))),
  )

  const [attemptsRes, profilesRes] = await Promise.all([
    attemptIds.length > 0
      ? supabase.from('user_attempts').select('id, session_id, level').in('id', attemptIds)
      : Promise.resolve({ data: [] as AttemptRow[] }),
    userIds.length > 0
      ? supabase.from('profiles').select('id, email').in('id', userIds)
      : Promise.resolve({ data: [] as ProfileRow[] }),
  ])

  const attempts = (attemptsRes.data ?? []) as AttemptRow[]
  const sessionIds = Array.from(
    new Set(attempts.map((a) => a.session_id).filter((v): v is string => Boolean(v))),
  )
  const { data: sessionsData } =
    sessionIds.length > 0
      ? await supabase.from('exam_sessions').select('id, mode').in('id', sessionIds)
      : { data: [] as SessionRow[] }

  const attemptById = new Map(attempts.map((a) => [a.id, a]))
  const sessionById = new Map(((sessionsData ?? []) as SessionRow[]).map((s) => [s.id, s]))
  const profileById = new Map(
    ((profilesRes.data ?? []) as ProfileRow[]).map((p) => [p.id, p]),
  )

  const enriched: FeedbackRow[] = feedbackRows.map((r) => {
    const attempt = r.attempt_id ? attemptById.get(r.attempt_id) : undefined
    const session = attempt?.session_id ? sessionById.get(attempt.session_id) : undefined
    const profile = r.user_id ? profileById.get(r.user_id) : undefined
    return {
      id: r.id,
      userId: r.user_id,
      email: profile?.email ?? null,
      level: attempt?.level ?? null,
      module: session?.mode ?? null,
      rating: r.rating,
      message: r.message,
      createdAt: r.created_at,
    }
  })

  // Level/module фильтры — в JS (low-volume data).
  const filtered = enriched.filter((r) => {
    if (filters.level !== 'all' && r.level !== filters.level) return false
    if (filters.module !== 'all' && r.module !== filters.module) return false
    return true
  })

  const totalMatching = filtered.length
  const start = (filters.page - 1) * PAGE_SIZE
  const rows = filtered.slice(start, start + PAGE_SIZE)

  return { rows, totalMatching, totalAll: totalAll ?? 0 }
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  await requireAdminPage('/admin/feedback')
  const filters = parseFilters(searchParams)
  const { rows, totalMatching, totalAll } = await loadFeedbackPage(filters)

  const hasActiveFilter =
    filters.rating !== 'all' ||
    filters.level !== 'all' ||
    filters.module !== 'all' ||
    filters.period !== 'all'

  const headerCount = hasActiveFilter ? totalMatching : totalAll
  const headerSuffix = hasActiveFilter ? 'по фильтру' : 'всего'

  return (
    <div className="max-w-7xl">
      <header className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Admin · feedback
        </div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          Отзывы.
          <br />
          <span className="text-ink-soft tabular-nums">
            {headerCount.toLocaleString('ru-RU')} {headerSuffix}.
          </span>
        </h1>
      </header>

      <FeedbackList
        rows={rows}
        totalMatching={totalMatching}
        filters={filters}
        pageSize={PAGE_SIZE}
      />
    </div>
  )
}
