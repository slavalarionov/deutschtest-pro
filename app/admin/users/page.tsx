import { requireAdminPage } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  DEFAULT_PAGE_SIZE,
  applyUserFilters,
  parseFilters,
  type UserFilters,
} from '@/lib/admin/user-filters'
import { UsersTable, type UserRow } from './users-table'

export const dynamic = 'force-dynamic'

interface ProfileRow {
  id: string
  email: string
  display_name: string | null
  created_at: string
  modules_balance: number
  is_admin: boolean
  is_unlimited: boolean | null
  is_blocked: boolean | null
}

interface AuthUserRow {
  id: string
  last_sign_in_at: string | null
}

interface AttemptAggRow {
  user_id: string
}

async function loadUsersPage(filters: UserFilters): Promise<{
  rows: UserRow[]
  totalMatching: number
  nextCursor: string | null
}> {
  const supabase = createAdminClient()

  // 1. Считаем total_matching.
  let countQ = supabase.from('profiles').select('id', { count: 'exact', head: true })
  countQ = applyUserFilters(countQ, filters)
  const { count: totalMatching } = await countQ

  // 2. Получаем страницу + 1 строку (для определения next_cursor).
  let pageQ = supabase
    .from('profiles')
    .select('id, email, display_name, created_at, modules_balance, is_admin, is_unlimited, is_blocked')
  pageQ = applyUserFilters(pageQ, filters)

  if (filters.cursor) {
    pageQ = pageQ.lt('created_at', filters.cursor)
  }

  const { data: profileRows } = await pageQ
    .order('created_at', { ascending: false })
    .limit(DEFAULT_PAGE_SIZE + 1)

  const profiles = (profileRows ?? []) as ProfileRow[]
  const hasMore = profiles.length > DEFAULT_PAGE_SIZE
  const pageProfiles = hasMore ? profiles.slice(0, DEFAULT_PAGE_SIZE) : profiles
  const nextCursor = hasMore ? pageProfiles[pageProfiles.length - 1].created_at : null

  if (pageProfiles.length === 0) {
    return { rows: [], totalMatching: totalMatching ?? 0, nextCursor: null }
  }

  const ids = pageProfiles.map((p) => p.id)

  // 3. Подтягиваем last_sign_in_at из auth.users через service role.
  const { data: authRows } = await supabase
    .schema('auth')
    .from('users')
    .select('id, last_sign_in_at')
    .in('id', ids)

  const lastSignInByUser = new Map<string, string | null>()
  for (const r of (authRows ?? []) as AuthUserRow[]) {
    lastSignInByUser.set(r.id, r.last_sign_in_at)
  }

  // 4. Считаем количество попыток у каждого.
  const { data: attemptRows } = await supabase
    .from('user_attempts')
    .select('user_id')
    .in('user_id', ids)
  const attemptsByUser = new Map<string, number>()
  for (const r of (attemptRows ?? []) as AttemptAggRow[]) {
    attemptsByUser.set(r.user_id, (attemptsByUser.get(r.user_id) ?? 0) + 1)
  }

  const rows: UserRow[] = pageProfiles.map((p) => ({
    id: p.id,
    email: p.email,
    displayName: p.display_name,
    createdAt: p.created_at,
    lastSignInAt: lastSignInByUser.get(p.id) ?? null,
    modulesBalance: p.modules_balance,
    isAdmin: p.is_admin,
    isUnlimited: p.is_unlimited ?? false,
    isBlocked: p.is_blocked ?? false,
    attemptsCount: attemptsByUser.get(p.id) ?? 0,
  }))

  return { rows, totalMatching: totalMatching ?? 0, nextCursor }
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  const admin = await requireAdminPage('/admin/users')
  const filters = parseFilters(searchParams)
  const { rows, totalMatching, nextCursor } = await loadUsersPage(filters)

  const hasActiveFilter =
    Boolean(filters.q) || filters.role !== 'all' || filters.status !== 'all'

  return (
    <div className="max-w-7xl">
      <header className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Admin · users
        </div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          Пользователи.
          <br />
          <span className="text-ink-soft tabular-nums">
            {totalMatching.toLocaleString('ru-RU')}
            {hasActiveFilter ? ' по фильтру.' : ' всего.'}
          </span>
        </h1>
      </header>

      <UsersTable
        rows={rows}
        totalMatching={totalMatching}
        nextCursor={nextCursor}
        filters={filters}
        currentAdminId={admin.id}
      />
    </div>
  )
}
