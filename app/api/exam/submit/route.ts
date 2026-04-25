import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession, type StoredSession } from '@/lib/session-store'
import { scoreSchreiben } from '@/lib/claude'
import type { ExamLevel, SchreibenContent } from '@/types/exam'
import { createServerClient } from '@/lib/supabase-server'
import { deductModuleBalanceIfNeeded } from '@/lib/billing'
import type { Json } from '@/types/supabase'
import type { Locale } from '@/i18n/request'

const submitLesenSchema = z.object({
  sessionId: z.string().min(1),
  type: z.literal('lesen'),
  answers: z.record(z.string(), z.string()),
})

const submitHorenSchema = z.object({
  sessionId: z.string().min(1),
  type: z.literal('horen'),
  answers: z.record(z.string(), z.string()),
})

const submitSchreibenSchema = z.object({
  sessionId: z.string().min(1),
  type: z.literal('schreiben'),
  taskId: z.number(),
  text: z.string().min(1),
})

const submitSchema = z.union([submitLesenSchema, submitHorenSchema, submitSchreibenSchema])

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = submitSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data = parsed.data
    const stored = await getSession(data.sessionId)

    if (!stored) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    if (data.type === 'lesen') {
      return await handleLesenSubmit(stored, data.answers)
    }

    if (data.type === 'horen') {
      return await handleHorenSubmit(stored, data.answers)
    }

    if (data.type === 'schreiben') {
      return await handleSchreibenSubmit(stored, data.taskId, data.text)
    }

    return NextResponse.json({ success: false, error: 'Unknown type' }, { status: 400 })
  } catch (err) {
    console.error('Submit error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function saveAttempt(
  sessionId: string,
  scores: Record<string, number>,
  aiFeedback: Record<string, unknown>,
  userInput?: Record<string, unknown>
) {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('user_attempts')
    .update({
      scores: scores as unknown as Json,
      ai_feedback: aiFeedback as unknown as Json,
      submitted_at: new Date().toISOString(),
      ...(userInput ? { user_input: userInput as unknown as Json } : {}),
    })
    .eq('session_id', sessionId)

  if (error) {
    console.error('[submit] saveAttempt update:', error.message)
  }
}

async function afterModuleSubmit(
  stored: StoredSession,
  scores: Record<string, number>,
  aiFeedback: Record<string, unknown>,
  userInput?: Record<string, unknown>
) {
  await saveAttempt(stored.id, scores, aiFeedback, userInput)
  await deductModuleBalanceIfNeeded(stored.userId, stored.id)
}

async function handleLesenSubmit(
  stored: StoredSession,
  userAnswers: Record<string, string>
) {
  const correctAnswers = stored.answers as Record<string, string>
  let correct = 0
  let total = 0
  const details: Record<string, { userAnswer: string; correctAnswer: string; isCorrect: boolean }> = {}

  for (const [questionId, correctAnswer] of Object.entries(correctAnswers)) {
    total++
    const userAnswer = userAnswers[questionId] || ''
    const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase()
    if (isCorrect) correct++
    details[questionId] = { userAnswer, correctAnswer, isCorrect }
  }

  const score = total > 0 ? Math.round((correct / total) * 100) : 0

  await afterModuleSubmit(stored, { lesen: score }, {
    lesen: { details, summary: { correct, total, score } },
  })

  return NextResponse.json({
    success: true,
    scores: { lesen: score },
    details,
    summary: { correct, total, score },
  })
}

async function handleHorenSubmit(
  stored: StoredSession,
  userAnswers: Record<string, string>
) {
  const correctAnswers = stored.answers as Record<string, string>
  let correct = 0
  let total = 0
  const details: Record<string, { userAnswer: string; correctAnswer: string; isCorrect: boolean }> = {}

  for (const [questionId, correctAnswer] of Object.entries(correctAnswers)) {
    if (!questionId.startsWith('h_')) continue
    total++
    const userAnswer = userAnswers[questionId] || ''
    const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase()
    if (isCorrect) correct++
    details[questionId] = { userAnswer, correctAnswer, isCorrect }
  }

  const score = total > 0 ? Math.round((correct / total) * 100) : 0

  await afterModuleSubmit(stored, { horen: score }, {
    horen: { details, summary: { correct, total, score } },
  })

  return NextResponse.json({
    success: true,
    scores: { horen: score },
    details,
    summary: { correct, total, score },
  })
}

async function handleSchreibenSubmit(
  stored: StoredSession,
  taskId: number,
  userText: string
) {
  const schreiben = (stored.content as Record<string, unknown>).schreiben as SchreibenContent | undefined
  if (!schreiben) {
    return NextResponse.json({ success: false, error: 'No Schreiben content' }, { status: 400 })
  }

  const task = schreiben.tasks.find((t) => t.id === taskId)
  if (!task) {
    return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 })
  }

  const supabase = createServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_language')
    .eq('id', stored.userId)
    .maybeSingle()
  const language = (profile?.preferred_language ?? 'de') as Locale

  const feedback = await scoreSchreiben(
    stored.level as ExamLevel,
    task.prompt + (task.context ? `\n\nKontext: ${task.context}` : ''),
    task.requiredPoints || [],
    userText,
    language,
    { sessionId: stored.id, userId: stored.userId }
  )

  const wordCount = userText.trim().length === 0
    ? 0
    : userText.trim().split(/\s+/).length

  await afterModuleSubmit(
    stored,
    { schreiben: feedback.score },
    { schreiben: feedback },
    { schreiben: { text: userText, wordCount } }
  )

  return NextResponse.json({
    success: true,
    scores: { schreiben: feedback.score },
    feedback,
  })
}
