import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session-store'
import { deductModuleBalanceIfNeeded } from '@/lib/billing'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'
import type { Json } from '@/types/supabase'

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
  transcript: z.string().optional(),
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

    const { sessionId, feedback, transcript } = parsed.data
    const stored = await getSession(sessionId)

    if (!stored) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    if (stored.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const serviceClient = createServerClient()
    const trimmedTranscript = transcript?.trim() ?? ''
    const { error: updateError } = await serviceClient
      .from('user_attempts')
      .update({
        scores: { sprechen: feedback.score } as unknown as Json,
        ai_feedback: { sprechen: feedback } as unknown as Json,
        submitted_at: new Date().toISOString(),
        ...(trimmedTranscript.length > 0
          ? { user_input: { sprechen: { transcript: trimmedTranscript } } as unknown as Json }
          : {}),
      })
      .eq('session_id', sessionId)

    if (updateError) {
      console.error('[finalize-sprechen] update:', updateError.message)
    }

    await deductModuleBalanceIfNeeded(user.id, sessionId)

    return NextResponse.json({
      success: true,
      scores: { sprechen: feedback.score },
      sessionComplete: true,
    })
  } catch (e) {
    console.error('finalize-sprechen:', e instanceof Error ? e.message : e)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
