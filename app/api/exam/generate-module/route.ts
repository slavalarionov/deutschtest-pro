import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getSession, mergeSessionContentAndAnswers } from '@/lib/session-store'
import { generateExamModule, type ExamModuleKey } from '@/lib/exam/generate-one-module'
import type { ExamLevel } from '@/types/exam'
import { parseModuleOrder } from '@/lib/exam/session-modules'

const bodySchema = z.object({
  sessionId: z.string().min(1),
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
        { status: 400 }
      )
    }

    const { sessionId, module } = parsed.data
    const stored = await getSession(sessionId)

    if (!stored) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    if (stored.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    if (new Date(stored.expiresAt) < new Date()) {
      return NextResponse.json({ success: false, error: 'Session expired' }, { status: 410 })
    }

    const order = parseModuleOrder(stored.mode, stored.sessionFlow)
    if (!order.includes(module)) {
      return NextResponse.json({ success: false, error: 'Modul nicht Teil dieser Sitzung' }, { status: 400 })
    }

    if (stored.currentModule !== module) {
      return NextResponse.json(
        { success: false, error: 'Falsches Modul für den aktuellen Fortschritt' },
        { status: 400 }
      )
    }

    const existing = stored.content as Record<string, unknown>
    if (existing[module] != null) {
      return NextResponse.json({ success: true, module, cached: true })
    }

    const { content: genContent, answers: genAnswers } = await generateExamModule(
      stored.level as ExamLevel,
      module as ExamModuleKey
    )

    await mergeSessionContentAndAnswers(sessionId, genContent, genAnswers)

    return NextResponse.json({ success: true, module })
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err)
    console.error('[generate-module]', raw, err)
    return NextResponse.json(
      {
        success: false,
        error: 'Generierung fehlgeschlagen. Bitte erneut versuchen.',
        ...(process.env.NODE_ENV === 'development' ? { debug: raw } : {}),
      },
      { status: 500 }
    )
  }
}
