// server-only
import { createServerClient } from '@/lib/supabase-server'

export type HistoryModule = 'lesen' | 'horen' | 'schreiben' | 'sprechen'
export type HistoryLevel = 'A1' | 'A2' | 'B1'
export type HistoryPaymentStatus = 'free' | 'paid' | 'pending'

export interface HistoryItem {
  attemptId: string
  sessionId: string
  submittedAt: string
  level: HistoryLevel
  module: HistoryModule
  score: number
  paymentStatus: HistoryPaymentStatus
  isFreeTest: boolean
}

export interface HistoryFilters {
  module?: HistoryModule
  level?: HistoryLevel
  from?: string
  to?: string
}

const VALID_MODULES: HistoryModule[] = ['lesen', 'horen', 'schreiben', 'sprechen']
const VALID_LEVELS: HistoryLevel[] = ['A1', 'A2', 'B1']

function extractModuleScore(
  scores: unknown
): { module: HistoryModule; score: number } | null {
  if (!scores || typeof scores !== 'object') return null
  const obj = scores as Record<string, unknown>
  for (const id of VALID_MODULES) {
    const value = obj[id]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return { module: id, score: value }
    }
  }
  return null
}

export function parseHistoryFilters(
  params: URLSearchParams
): HistoryFilters {
  const filters: HistoryFilters = {}

  const moduleParam = params.get('module')
  if (moduleParam && (VALID_MODULES as string[]).includes(moduleParam)) {
    filters.module = moduleParam as HistoryModule
  }

  const level = params.get('level')
  if (level && (VALID_LEVELS as string[]).includes(level)) {
    filters.level = level as HistoryLevel
  }

  const from = params.get('from')
  if (from && !Number.isNaN(Date.parse(from))) {
    filters.from = new Date(from).toISOString()
  }

  const to = params.get('to')
  if (to && !Number.isNaN(Date.parse(to))) {
    // interpret as end-of-day inclusive
    const d = new Date(to)
    d.setHours(23, 59, 59, 999)
    filters.to = d.toISOString()
  }

  return filters
}

export async function loadUserHistory(
  userId: string,
  filters: HistoryFilters = {}
): Promise<HistoryItem[]> {
  const supabase = createServerClient()

  let query = supabase
    .from('user_attempts')
    .select('id, session_id, level, scores, submitted_at, is_free_test, payment_status')
    .eq('user_id', userId)
    .not('submitted_at', 'is', null)
    .not('scores', 'is', null)
    .order('submitted_at', { ascending: false })

  if (filters.level) query = query.eq('level', filters.level)
  if (filters.from) query = query.gte('submitted_at', filters.from)
  if (filters.to) query = query.lte('submitted_at', filters.to)

  const { data, error } = await query

  if (error) {
    console.error('[dashboard/history] query:', error.message)
    return []
  }

  const rows = data ?? []
  const items: HistoryItem[] = []

  for (const row of rows) {
    const pair = extractModuleScore(row.scores)
    if (!pair) continue
    if (filters.module && pair.module !== filters.module) continue
    if (!row.submitted_at) continue

    items.push({
      attemptId: row.id as string,
      sessionId: row.session_id as string,
      submittedAt: row.submitted_at as string,
      level: row.level as HistoryLevel,
      module: pair.module,
      score: pair.score,
      paymentStatus: (row.payment_status ?? 'free') as HistoryPaymentStatus,
      isFreeTest: Boolean(row.is_free_test),
    })
  }

  return items
}
