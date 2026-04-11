import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session-store'
import { advanceFullTestSession, mergeAttemptScores } from '@/lib/exam/full-test'
import { createClient } from '@/lib/supabase/server'

const criteriaSchema = z.object({
  taskFulfillment: z.number(),
  fluency: z.number(),
  vocabulary: z.number(),
  grammar: z.number(),
  pronunciation: z.number(),
})

const bodySchema = z.object({
  sessionId: z.string().min(1),
  feedback: z.object({
    score: z.number(),
    criteria: criteriaSchema,
    comment: z.string(),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Nicht autorisiert' }, { status: 401 })
    }

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { sessionId, feedback } = parsed.data
    const stored = await getSession(sessionId)

    if (!stored) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    if (stored.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    if (stored.mode !== 'full' && stored.mode !== 'sprechen') {
      return NextResponse.json({ success: false, error: 'Invalid session mode' }, { status: 400 })
    }

    await mergeAttemptScores(
      sessionId,
      { sprechen: feedback.score },
      { sprechen: feedback },
      { setSubmittedAt: true }
    )

    let fullTestCompleted = false
    if (stored.sessionFlow === 'full_test') {
      const { next } = await advanceFullTestSession(sessionId, 'sprechen')
      fullTestCompleted = next === 'completed'
    }

    return NextResponse.json({
      success: true,
      scores: { sprechen: feedback.score },
      fullTestCompleted,
      sessionFlow: stored.sessionFlow,
    })
  } catch (e) {
    console.error('finalize-sprechen:', e instanceof Error ? e.message : e)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
