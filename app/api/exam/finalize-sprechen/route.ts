import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session-store'
import { mergeAttemptScores } from '@/lib/exam/full-test'
import { advanceSessionAfterModule, parseModuleOrder } from '@/lib/exam/session-modules'
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

    const order = parseModuleOrder(stored.mode, stored.sessionFlow)
    if (!order.includes('sprechen')) {
      return NextResponse.json({ success: false, error: 'Invalid session mode' }, { status: 400 })
    }

    const idx = order.indexOf('sprechen')
    const hasNext = idx >= 0 && idx < order.length - 1

    await mergeAttemptScores(
      sessionId,
      { sprechen: feedback.score },
      { sprechen: feedback },
      { setSubmittedAt: !hasNext }
    )

    let sessionComplete = false
    if (order.length > 1) {
      const { next } = await advanceSessionAfterModule(sessionId, 'sprechen', {
        mode: stored.mode,
        sessionFlow: stored.sessionFlow,
        completedModules: stored.completedModules,
      })
      sessionComplete = next === 'completed'
    } else {
      sessionComplete = true
    }

    return NextResponse.json({
      success: true,
      scores: { sprechen: feedback.score },
      sessionComplete,
      sessionFlow: stored.sessionFlow,
    })
  } catch (e) {
    console.error('finalize-sprechen:', e instanceof Error ? e.message : e)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
