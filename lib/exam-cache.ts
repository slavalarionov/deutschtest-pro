import { createServerClient } from './supabase-server'
import type { ExamSession } from '@/types/exam'
import type { Database } from '@/types/supabase'

type ExamSessionRow = Database['public']['Tables']['exam_sessions']['Row']

const CACHE_TTL_HOURS = 24

export async function getCachedSession(
  sessionId: string
): Promise<ExamSession | null> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error || !data) return null

  const row = data as ExamSessionRow
  const expiresAt = new Date(row.expires_at)
  if (expiresAt < new Date()) return null

  const flow = row.session_flow === 'full_test' ? 'full_test' : 'single'

  return {
    id: row.id,
    level: row.level as ExamSession['level'],
    mode: row.mode as ExamSession['mode'],
    sessionFlow: flow,
    currentModule: row.current_module ?? null,
    content: row.content as ExamSession['content'],
    audioUrls: row.audio_urls as ExamSession['audioUrls'],
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }
}

export async function cacheSession(
  session: ExamSession,
  answers: Record<string, unknown>
): Promise<void> {
  const supabase = createServerClient()

  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS)

  const row: Database['public']['Tables']['exam_sessions']['Insert'] = {
    id: session.id,
    user_id: 'anonymous',
    level: session.level,
    mode: session.mode,
    session_flow: session.sessionFlow ?? 'single',
    current_module: session.currentModule ?? null,
    content: JSON.parse(JSON.stringify(session.content)),
    answers: JSON.parse(JSON.stringify(answers)),
    audio_urls: session.audioUrls ? JSON.parse(JSON.stringify(session.audioUrls)) : null,
    expires_at: expiresAt.toISOString(),
  }

  await supabase.from('exam_sessions').upsert(row as never)
}
