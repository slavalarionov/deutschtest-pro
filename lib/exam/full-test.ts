import { createServerClient } from '@/lib/supabase-server'
import type { Json } from '@/types/supabase'
import { FULL_TEST_MODULE_ORDER, type FullTestModule } from '@/lib/exam/full-test-constants'

export { FULL_TEST_MODULE_ORDER, type FullTestModule } from '@/lib/exam/full-test-constants'

export function getNextFullTestModule(
  completed: FullTestModule
): FullTestModule | 'completed' {
  const i = FULL_TEST_MODULE_ORDER.indexOf(completed)
  if (i < 0 || i >= FULL_TEST_MODULE_ORDER.length - 1) {
    return 'completed'
  }
  return FULL_TEST_MODULE_ORDER[i + 1]
}

export async function advanceFullTestSession(
  sessionId: string,
  completedModule: FullTestModule
): Promise<{ next: FullTestModule | 'completed' }> {
  const next = getNextFullTestModule(completedModule)
  const supabase = createServerClient()
  const nextModule = next === 'completed' ? 'completed' : next
  const { error } = await supabase
    .from('exam_sessions')
    .update({ current_module: nextModule })
    .eq('id', sessionId)

  if (error) {
    console.error('[full-test] advance failed:', error.message)
  }
  return { next }
}

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
