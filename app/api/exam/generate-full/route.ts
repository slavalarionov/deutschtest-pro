import { NextResponse } from 'next/server'
import {
  generateLesenFull,
  generateSchreiben,
  generateHorenFull,
  generateSprechen,
} from '@/lib/claude'
import { saveSession } from '@/lib/session-store'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkUserCanTakeTest } from '@/lib/exam/limits'
import { randomUUID } from 'crypto'

export const maxDuration = 300

/** Full Goethe B1 simulation: all four modules in one session (Lesen → Hören → Schreiben → Sprechen). */
export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

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

    const level = 'B1' as const

    const [lesenR, horenR, schreibenR, sprechenR] = await Promise.all([
      generateLesenFull(level),
      generateHorenFull(level),
      generateSchreiben(level),
      generateSprechen(level),
    ])

    const content: Record<string, unknown> = {
      lesen: lesenR.content,
      horen: horenR.content,
      schreiben: schreibenR.content,
      sprechen: sprechenR.content,
    }

    const answers: Record<string, unknown> = {
      ...(lesenR.answers as Record<string, unknown>),
      ...(horenR.answers as Record<string, unknown>),
    }

    const sessionId = randomUUID()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    await saveSession({
      id: sessionId,
      userId: user.id,
      level,
      mode: 'full',
      sessionFlow: 'full_test',
      currentModule: 'lesen',
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
      console.error('[generate-full] user_attempt:', JSON.stringify(insertError))
    }

    return NextResponse.json({
      success: true,
      sessionId,
      session: {
        id: sessionId,
        level,
        mode: 'full' as const,
        sessionFlow: 'full_test' as const,
        currentModule: 'lesen' as const,
        content,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    })
  } catch (err) {
    console.error('generate-full:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      {
        success: false,
        error:
          'Der vollständige Test konnte nicht generiert werden. Bitte versuchen Sie es später erneut.',
      },
      { status: 500 }
    )
  }
}
