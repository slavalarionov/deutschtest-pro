import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { saveSession } from '@/lib/session-store'
import { generateExamModule, type ExamModuleKey } from '@/lib/exam/generate-one-module'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkUserCanTakeTest } from '@/lib/exam/limits'
import { sortModulesByExamOrder } from '@/lib/exam/module-order'
import { randomUUID } from 'crypto'

const moduleEnum = z.enum(['lesen', 'horen', 'schreiben', 'sprechen'])

const requestSchema = z.object({
  level: z.enum(['A1', 'A2', 'B1']),
  modules: z.array(moduleEnum).min(1).max(4),
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

    const { level, modules: rawModules } = parsed.data
    const modules = sortModulesByExamOrder(rawModules)

    if (modules.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid modules selected' },
        { status: 400 }
      )
    }

    const needsPrepaidSlots =
      !availability.isAdmin &&
      !availability.freeTestAvailable &&
      availability.paidTestsCount === 0

    if (needsPrepaidSlots && (availability.modulesBalance ?? 0) < modules.length) {
      return NextResponse.json(
        {
          success: false,
          error: `Nicht genug Modul-Credits (${availability.modulesBalance ?? 0} verfügbar, ${modules.length} benötigt). Bitte kaufen Sie weitere Module.`,
          code: 'insufficient_balance',
          redirect: '/pricing',
        },
        { status: 403 }
      )
    }

    const firstModule = modules[0]! as ExamModuleKey
    const { content: genContent, answers: genAnswers } = await generateExamModule(level, firstModule)
    const content: Record<string, unknown> = { ...genContent }
    const answers: Record<string, unknown> = { ...genAnswers }

    const sessionId = randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const mode = modules.length > 1 ? modules.join(',') : modules[0]!
    const sessionFlow = modules.length > 1 ? 'multi' : 'single'
    const currentModule = modules.length > 1 ? modules[0]! : null

    await saveSession({
      id: sessionId,
      userId: user.id,
      level,
      mode,
      sessionFlow,
      currentModule,
      completedModules: '',
      content,
      answers,
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
      firstModule,
      session: {
        id: sessionId,
        level,
        mode,
        sessionFlow,
        currentModule,
        completedModules: '',
        content,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    })
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err)
    console.error('Exam generation error:', raw, err)

    const lower = raw.toLowerCase()
    let error =
      'Die Prüfung konnte nicht generiert werden. Bitte versuchen Sie es etwas später erneut.'

    if (
      lower.includes('timeout') ||
      lower.includes('timed out') ||
      lower.includes('504') ||
      lower.includes('task timed out') ||
      lower.includes('max duration')
    ) {
      error =
        'Zeitüberschreitung bei der Generierung. Wählen Sie weniger Module auf einmal oder versuchen Sie es später erneut. (Auf Vercel Free/Hobby gilt oft ein Limit von ca. 60 s.)'
    } else if (lower.includes('completed_modules') || lower.includes('session_flow')) {
      error =
        'Datenbank-Schema veraltet: bitte Migrationen 003 und 004 in Supabase ausführen (completed_modules, session_flow multi).'
    } else if (lower.includes('rate limit') || lower.includes('429') || lower.includes('overloaded')) {
      error =
        'Der KI-Dienst ist vorübergehend überlastet. Bitte in 1–2 Minuten erneut versuchen oder weniger Module wählen.'
    }

    return NextResponse.json(
      {
        success: false,
        error,
        ...(process.env.NODE_ENV === 'development' ? { debug: raw } : {}),
      },
      { status: 500 }
    )
  }
}
