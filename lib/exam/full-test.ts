import { createServerClient } from '@/lib/supabase-server'
import type { Json } from '@/types/supabase'

export async function mergeAttemptScores(
  sessionId: string,
  newScores: Record<string, number>,
  newFeedback?: Record<string, unknown>,
  options?: { setSubmittedAt: boolean }
): Promise<void> {
  const supabase = createServerClient()
  const { data: row, error: fetchErr } = await supabase
    .from('user_attempts')
    .select('scores, ai_feedback')
    .eq('session_id', sessionId)
    .single()

  if (fetchErr) {
    console.error('[mergeAttemptScores] fetch:', fetchErr.message)
  }

  const prevScores = (row?.scores as Record<string, number> | null) ?? {}
  const prevFeedback = (row?.ai_feedback as Record<string, unknown> | null) ?? {}
  const scores = { ...prevScores, ...newScores }
  const aiFeedback = { ...prevFeedback, ...newFeedback }

  const payload: {
    scores: Json
    ai_feedback: Json
    submitted_at?: string
  } = {
    scores: scores as unknown as Json,
    ai_feedback: aiFeedback as unknown as Json,
  }
  if (options?.setSubmittedAt) {
    payload.submitted_at = new Date().toISOString()
  }

  const { error } = await supabase.from('user_attempts').update(payload).eq('session_id', sessionId)

  if (error) {
    console.error('[mergeAttemptScores] update:', error.message)
  }
}
