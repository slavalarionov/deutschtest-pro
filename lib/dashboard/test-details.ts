// server-only
import { createServerClient } from '@/lib/supabase-server'
import type {
  HistoryLevel,
  HistoryModule,
  HistoryPaymentStatus,
} from '@/lib/dashboard/history'
import type {
  SchreibenContent,
  SchreibenFeedback,
  SprechenContent,
  SprechenFeedback,
} from '@/types/exam'

const VALID_MODULES: HistoryModule[] = ['lesen', 'horen', 'schreiben', 'sprechen']

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

export interface AnswerDetail {
  userAnswer: string
  correctAnswer: string
  isCorrect: boolean
}

export interface LesenHorenAttemptFeedback {
  details: Record<string, AnswerDetail>
  summary: { correct: number; total: number; score: number }
}

export interface TestDetailsBase {
  attemptId: string
  sessionId: string
  submittedAt: string
  level: HistoryLevel
  module: HistoryModule
  score: number
  passed: boolean
  paymentStatus: HistoryPaymentStatus
  isFreeTest: boolean
}

export interface LesenHorenTestDetails extends TestDetailsBase {
  module: 'lesen' | 'horen'
  feedback: LesenHorenAttemptFeedback | null
}

export interface SchreibenTestDetails extends TestDetailsBase {
  module: 'schreiben'
  feedback: SchreibenFeedback | null
  content: SchreibenContent | null
}

export interface SprechenTestDetails extends TestDetailsBase {
  module: 'sprechen'
  feedback: SprechenFeedback | null
  content: SprechenContent | null
}

export type TestDetails =
  | LesenHorenTestDetails
  | SchreibenTestDetails
  | SprechenTestDetails

export type TestDetailsError = 'not_found' | 'forbidden' | 'not_submitted'

export async function loadTestDetails(
  userId: string,
  attemptId: string
): Promise<
  { ok: true; details: TestDetails } | { ok: false; reason: TestDetailsError }
> {
  const supabase = createServerClient()

  const { data: attempt, error: attemptError } = await supabase
    .from('user_attempts')
    .select(
      'id, user_id, session_id, level, submitted_at, scores, ai_feedback, is_free_test, payment_status'
    )
    .eq('id', attemptId)
    .maybeSingle()

  if (attemptError || !attempt) {
    return { ok: false, reason: 'not_found' }
  }

  if (attempt.user_id !== userId) {
    return { ok: false, reason: 'forbidden' }
  }

  if (!attempt.submitted_at || !attempt.scores) {
    return { ok: false, reason: 'not_submitted' }
  }

  const pair = extractModuleScore(attempt.scores)
  if (!pair) {
    return { ok: false, reason: 'not_submitted' }
  }

  const base: TestDetailsBase = {
    attemptId: attempt.id as string,
    sessionId: attempt.session_id as string,
    submittedAt: attempt.submitted_at as string,
    level: attempt.level as HistoryLevel,
    module: pair.module,
    score: pair.score,
    passed: pair.score >= 60,
    paymentStatus: (attempt.payment_status ?? 'free') as HistoryPaymentStatus,
    isFreeTest: Boolean(attempt.is_free_test),
  }

  const aiFeedback = (attempt.ai_feedback ?? {}) as Record<string, unknown>

  if (pair.module === 'lesen' || pair.module === 'horen') {
    const fb = aiFeedback[pair.module] as LesenHorenAttemptFeedback | undefined
    return {
      ok: true,
      details: {
        ...base,
        module: pair.module,
        feedback: fb ?? null,
      },
    }
  }

  const { data: session } = await supabase
    .from('exam_sessions')
    .select('content')
    .eq('id', attempt.session_id as string)
    .maybeSingle()

  const sessionContent = (session?.content ?? null) as Record<string, unknown> | null

  if (pair.module === 'schreiben') {
    const fb = aiFeedback.schreiben as SchreibenFeedback | undefined
    const content =
      (sessionContent?.schreiben as SchreibenContent | undefined) ?? null
    return {
      ok: true,
      details: {
        ...base,
        module: 'schreiben',
        feedback: fb ?? null,
        content,
      },
    }
  }

  // sprechen
  const fb = aiFeedback.sprechen as SprechenFeedback | undefined
  const content =
    (sessionContent?.sprechen as SprechenContent | undefined) ?? null
  return {
    ok: true,
    details: {
      ...base,
      module: 'sprechen',
      feedback: fb ?? null,
      content,
    },
  }
}
