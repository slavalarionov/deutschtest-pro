import { createAdminClient } from '@/lib/supabase/admin'

export const SOURCE_IDS = [
  'ai',
  'search',
  'friend',
  'teacher',
  'ads',
  'social',
  'other',
] as const
export type SourceId = (typeof SOURCE_IDS)[number]

export type PeriodFilter = 'all' | 'today' | '7d' | '30d'

export interface ReferralSourceStats {
  total: {
    registered: number
    asked: number
    answered: number
    skipped: number
    conversion: number | null
  }
  breakdown: Array<{
    source: SourceId
    count: number
    percent: number
  }>
}

export function periodLowerBound(period: PeriodFilter): Date | null {
  if (period === 'all') return null
  if (period === 'today') {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  const days = period === '7d' ? 7 : 30
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

interface ProfileRow {
  referral_source: string | null
  referral_source_asked: boolean | null
}

export async function loadReferralSourceStats(
  period: PeriodFilter,
): Promise<ReferralSourceStats> {
  const supabase = createAdminClient()

  // Single query — при ~1000 юзеров дёшево. Агрегируем в JS,
  // так все три числа (registered/asked/answered) гарантированно
  // считаются из одного набора строк и не расходятся между собой.
  let q = supabase
    .from('profiles')
    .select('referral_source, referral_source_asked')

  const lower = periodLowerBound(period)
  if (lower) q = q.gte('created_at', lower.toISOString())

  const { data } = await q
  const rows = (data ?? []) as ProfileRow[]

  const registered = rows.length
  let asked = 0
  let answered = 0
  const counts = new Map<SourceId, number>()
  for (const id of SOURCE_IDS) counts.set(id, 0)

  for (const r of rows) {
    if (r.referral_source_asked === true) asked += 1
    if (r.referral_source) {
      answered += 1
      if ((SOURCE_IDS as readonly string[]).includes(r.referral_source)) {
        const id = r.referral_source as SourceId
        counts.set(id, (counts.get(id) ?? 0) + 1)
      }
    }
  }
  const skipped = asked - answered
  const conversion = asked > 0 ? answered / asked : null

  const breakdown = SOURCE_IDS.map((source) => {
    const count = counts.get(source) ?? 0
    const percent = answered > 0 ? (count / answered) * 100 : 0
    return { source, count, percent }
  }).sort((a, b) => b.count - a.count)

  return {
    total: { registered, asked, answered, skipped, conversion },
    breakdown,
  }
}

export const SOURCE_LABELS_RU: Record<SourceId, string> = {
  ai: 'ИИ (ChatGPT, Claude и др.)',
  search: 'Поисковик (Google, Яндекс)',
  friend: 'От знакомого',
  teacher: 'От преподавателя',
  ads: 'Реклама',
  social: 'Соцсети (YouTube, TikTok, Telegram)',
  other: 'Другое',
}
