import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateLesenFull, generateSchreiben, generateHorenFull, generateSprechen } from '@/lib/claude'
import { saveSession } from '@/lib/session-store'
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

    let content: Record<string, unknown> = {}
    let answers: Record<string, unknown> = {}

    for (const mod of modules) {
      if (mod === 'lesen') {
        const result = await generateLesenFull(level)
        content = { ...content, lesen: result.content }
        answers = { ...answers, ...(result.answers as Record<string, unknown>) }
      } else if (mod === 'horen') {
        const result = await generateHorenFull(level)
        content = { ...content, horen: result.content }
        answers = { ...answers, ...(result.answers as Record<string, unknown>) }
      } else if (mod === 'schreiben') {
        const result = await generateSchreiben(level)
        content = { ...content, schreiben: result.content }
      } else if (mod === 'sprechen') {
        const result = await generateSprechen(level)
        content = { ...content, sprechen: result.content }
      }
    }

    const sessionId = randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const mode = modules.join(',')
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

    const firstModule = modules[0]!

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
    console.error('Exam generation error:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { success: false, error: 'Die Prüfung konnte nicht generiert werden. Bitte versuchen Sie es etwas später erneut.' },
      { status: 500 }
    )
  }
}
