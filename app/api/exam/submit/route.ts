import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession, type StoredSession } from '@/lib/session-store'
import { scoreSchreiben } from '@/lib/claude'
import type { ExamLevel, SchreibenContent } from '@/types/exam'
import { mergeAttemptScores } from '@/lib/exam/full-test'
import { advanceSessionAfterModule, parseModuleOrder } from '@/lib/exam/session-modules'

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

async function afterModuleSubmit(
  stored: StoredSession,
  module: string,
  scores: Record<string, number>,
  aiFeedback?: Record<string, unknown>
) {
  const order = parseModuleOrder(stored.mode, stored.sessionFlow)
  const isMulti = order.length > 1
  const idx = order.indexOf(module)
  const hasNext = idx >= 0 && idx < order.length - 1

  await mergeAttemptScores(stored.id, scores, aiFeedback, { setSubmittedAt: !hasNext })

  let nextModule: string | null = null
  if (isMulti) {
    const { next } = await advanceSessionAfterModule(stored.id, module, {
      mode: stored.mode,
      sessionFlow: stored.sessionFlow,
      completedModules: stored.completedModules,
    })
    nextModule = next === 'completed' ? null : next
  }

  return { nextModule, sessionFlow: stored.sessionFlow }
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

  const { nextModule, sessionFlow } = await afterModuleSubmit(stored, 'lesen', { lesen: score }, {
    lesen: { details, summary: { correct, total, score } },
  })

  return NextResponse.json({
    success: true,
    scores: { lesen: score },
    details,
    summary: { correct, total, score },
    nextModule,
    sessionFlow,
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

  const { nextModule, sessionFlow } = await afterModuleSubmit(stored, 'horen', { horen: score }, {
    horen: { details, summary: { correct, total, score } },
  })

  return NextResponse.json({
    success: true,
    scores: { horen: score },
    details,
    summary: { correct, total, score },
    nextModule,
    sessionFlow,
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

  const feedback = await scoreSchreiben(
    stored.level as ExamLevel,
    task.prompt + (task.context ? `\n\nKontext: ${task.context}` : ''),
    task.requiredPoints || [],
    userText
  )

  const { nextModule, sessionFlow } = await afterModuleSubmit(
    stored,
    'schreiben',
    { schreiben: feedback.score },
    { schreiben: feedback }
  )

  return NextResponse.json({
    success: true,
    scores: { schreiben: feedback.score },
    feedback,
    nextModule,
    sessionFlow,
  })
}
