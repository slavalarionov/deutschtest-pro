/**
 * Общие типы и хелперы для фильтров /admin/users.
 * Используется и в SSR странице списка, и в GET /api/admin/users.
 */

export type RoleFilter = 'all' | 'admin' | 'regular'
export type StatusFilter = 'all' | 'active' | 'blocked' | 'unlimited'
export type BalanceFilter = 'all' | 'has' | 'zero'
export type CreatedFilter = 'all' | 'today' | '7d' | '30d'

export interface UserFilters {
  q?: string
  role?: RoleFilter
  status?: StatusFilter
  balance?: BalanceFilter
  created?: CreatedFilter
  test?: '1'
  cursor?: string
}

export const DEFAULT_PAGE_SIZE = 50

export function parseFilters(raw: Record<string, string | undefined>): UserFilters {
  const role = (raw.role as RoleFilter) || 'all'
  const status = (raw.status as StatusFilter) || 'all'
  const balance = (raw.balance as BalanceFilter) || 'all'
  const created = (raw.created as CreatedFilter) || 'all'
  return {
    q: raw.q?.trim() || undefined,
    role,
    status,
    balance,
    created,
    test: raw.test === '1' ? '1' : undefined,
    cursor: raw.cursor || undefined,
  }
}

// Возвращает ISO-дату границы фильтра created. null — нет ограничения.
export function createdLowerBound(f: CreatedFilter | undefined): string | null {
  if (!f || f === 'all') return null
  const now = new Date()
  if (f === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  }
  if (f === '7d') return new Date(now.getTime() - 7 * 86400 * 1000).toISOString()
  if (f === '30d') return new Date(now.getTime() - 30 * 86400 * 1000).toISOString()
  return null
}

// Правила для shortcut «Тестовые аккаунты».
// Matches: email содержит '@test.' ИЛИ '+test@' ИЛИ created < 1h ago.
export function testAccountClause(): {
  emailOr: string
  createdAfter: string
} {
  return {
    // Supabase `or()` строка. ILIKE pattern-matching. Звёздочки в .or() не поддерживаются,
    // используем ilike с %.
    emailOr: 'email.ilike.%@test.%,email.ilike.%+test@%',
    createdAfter: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  }
}

/**
 * Применяет набор фильтров к подготовленному Supabase-запросу по таблице profiles.
 * Используется в двух местах (SSR и /api/admin/users) — держим реализацию единой,
 * чтобы поведение «Выбрать всех по фильтру» совпадало с отображаемой страницей.
 *
 * Если filters.test === '1' — применяется поверх остальных: (email-паттерн) OR (created < 1h).
 */
export function applyUserFilters<T>(query: T, filters: UserFilters): T {
  const q = query as unknown as {
    ilike: (col: string, pat: string) => T
    eq: (col: string, v: unknown) => T
    is: (col: string, v: unknown) => T
    gt: (col: string, v: unknown) => T
    gte: (col: string, v: unknown) => T
    or: (expr: string) => T
  }

  let next: T = query

  if (filters.q) {
    next = q.ilike('email', `${filters.q}%`)
  }

  if (filters.role === 'admin') {
    next = (next as unknown as typeof q).eq('is_admin', true)
  } else if (filters.role === 'regular') {
    next = (next as unknown as typeof q).eq('is_admin', false)
  }

  if (filters.status === 'blocked') {
    next = (next as unknown as typeof q).eq('is_blocked', true)
  } else if (filters.status === 'unlimited') {
    next = (next as unknown as typeof q).eq('is_unlimited', true)
  } else if (filters.status === 'active') {
    // Active = не заблокирован И не безлимит (обычный юзер).
    next = (next as unknown as typeof q).or('is_blocked.is.null,is_blocked.eq.false')
    next = (next as unknown as typeof q).or('is_unlimited.is.null,is_unlimited.eq.false')
  }

  if (filters.balance === 'has') {
    next = (next as unknown as typeof q).gt('modules_balance', 0)
  } else if (filters.balance === 'zero') {
    next = (next as unknown as typeof q).eq('modules_balance', 0)
  }

  const createdFrom = createdLowerBound(filters.created)
  if (createdFrom) {
    next = (next as unknown as typeof q).gte('created_at', createdFrom)
  }

  if (filters.test === '1') {
    const t = testAccountClause()
    next = (next as unknown as typeof q).or(`${t.emailOr},created_at.gte.${t.createdAfter}`)
  }

  return next
}
