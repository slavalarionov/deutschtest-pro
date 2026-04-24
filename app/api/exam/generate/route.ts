import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { saveSession } from '@/lib/session-store'
import { generateExamModule, type ExamModuleKey } from '@/lib/exam/generate-one-module'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkUserCanTakeTest } from '@/lib/exam/limits'
import { randomUUID } from 'crypto'

const requestSchema = z.object({
  level: z.enum(['A1', 'A2', 'B1']),
  module: z.enum(['lesen', 'horen', 'schreiben', 'sprechen']),
})

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Nicht autorisiert', redirect: '/login' },
        { status: 401 }
      )
    }

    const availability = await checkUserCanTakeTest(user.id, user.email)

    if (!availability.canTake) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sie haben bereits Ihren kostenlosen Test verwendet. Bitte kaufen Sie weitere Tests.',
          redirect: '/pricing',
        },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { level, module } = parsed.data

    const needsPrepaidSlots =
      !availability.isAdmin &&
      !availability.freeTestAvailable &&
      availability.paidTestsCount === 0

    if (needsPrepaidSlots && (availability.modulesBalance ?? 0) < 1) {
      return NextResponse.json(
        {
          success: false,
          error: `Nicht genug Guthaben (${availability.modulesBalance ?? 0} Module verfügbar, 1 benötigt). Bitte laden Sie Ihr Guthaben auf.`,
          code: 'insufficient_balance',
          redirect: '/pricing',
        },
        { status: 403 }
      )
    }

    const sessionId = randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const { content: genContent, answers: genAnswers } = await generateExamModule(
      level,
      module as ExamModuleKey,
      { sessionId, userId: user.id }
    )

    await saveSession({
      id: sessionId,
      userId: user.id,
      level,
      mode: module,
      sessionFlow: 'single',
      currentModule: null,
      completedModules: '',
      content: genContent,
      answers: genAnswers,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    })

    const isFreeTest = availability.freeTestAvailable
    const serviceClient = createServerClient()

    const { error: insertError } = await serviceClient.from('user_attempts').insert({
      user_id: user.id,
      session_id: sessionId,
      level,
      is_free_test: isFreeTest,
      payment_status: isFreeTest ? 'free' : 'paid',
    })

    if (insertError) {
      console.error('[generate] Failed to insert user_attempt:', JSON.stringify(insertError))
    } else {
      console.log('[generate] user_attempt saved — user:', user.id, 'is_free_test:', isFreeTest)
    }

    return NextResponse.json({
      success: true,
      sessionId,
      session: {
        id: sessionId,
        level,
        mode: module,
        sessionFlow: 'single',
        currentModule: null,
        completedModules: '',
        content: genContent,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    })
  } catch (e: unknown) {
    const err = e instanceof Error ? e : null
    console.error('[generate] FAIL', {
      message: err?.message ?? String(e),
      stack: err?.stack,
      name: err?.name,
    })
    const message = err?.message ?? (typeof e === 'string' ? e : 'unknown')
    return NextResponse.json({ error: message, code: 'GENERATE_FAILED' }, { status: 500 })
  }
}
