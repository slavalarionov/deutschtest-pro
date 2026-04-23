import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'
import { saveSession } from '@/lib/session-store'
import { generateExamModule, type ExamModuleKey } from '@/lib/exam/generate-one-module'
import { getModulesBalance, deductModuleFromBalance } from '@/lib/billing'
import type { ExamLevel } from '@/types/exam'

const bodySchema = z.object({
  originalSessionId: z.string().uuid(),
  module: z.enum(['lesen', 'horen', 'schreiben', 'sprechen']),
})

export const maxDuration = 300

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
        { status: 400 },
      )
    }

    const { originalSessionId, module } = parsed.data
    const serviceClient = createServerClient()

    const { data: origSession, error: origErr } = await serviceClient
      .from('exam_sessions')
      .select('user_id, level')
      .eq('id', originalSessionId)
      .single()

    if (origErr || !origSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    if (origSession.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const balance = await getModulesBalance(user.id)
    if (balance < 1) {
      return NextResponse.json(
        { success: false, error: 'INSUFFICIENT_BALANCE' },
        { status: 402 },
      )
    }

    await deductModuleFromBalance(user.id, 1)

    const newSessionId = randomUUID()

    let genContent: Record<string, unknown>
    let genAnswers: Record<string, unknown>
    try {
      const result = await generateExamModule(
        origSession.level as ExamLevel,
        module as ExamModuleKey,
        { sessionId: newSessionId, userId: user.id },
      )
      genContent = result.content
      genAnswers = result.answers
    } catch (genErr) {
      try {
        const bal = await getModulesBalance(user.id)
        await serviceClient
          .from('profiles')
          .update({ modules_balance: bal + 1 })
          .eq('id', user.id)
      } catch { /* best effort refund */ }
      throw genErr
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    await saveSession({
      id: newSessionId,
      userId: user.id,
      level: origSession.level,
      mode: module,
      sessionFlow: 'single',
      currentModule: null,
      completedModules: '',
      content: genContent,
      answers: genAnswers,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      retakeOf: originalSessionId,
      retakeModule: module,
    })

    const { error: insertError } = await serviceClient.from('user_attempts').insert({
      user_id: user.id,
      session_id: newSessionId,
      level: origSession.level,
      is_free_test: false,
      payment_status: 'paid',
    })

    if (insertError) {
      console.error('[retake-module] Failed to insert user_attempt:', insertError.message)
    }

    return NextResponse.json({ success: true, newSessionId })
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err)
    console.error('[retake-module]', raw, err)
    return NextResponse.json(
      {
        success: false,
        error: 'Generierung fehlgeschlagen. Bitte erneut versuchen.',
        ...(process.env.NODE_ENV === 'development' ? { debug: raw } : {}),
      },
      { status: 500 },
    )
  }
}
