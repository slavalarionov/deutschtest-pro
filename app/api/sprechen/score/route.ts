import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { scoreSprechen } from '@/lib/claude'
import { createClient } from '@/lib/supabase/server'
import type { ExamLevel } from '@/types/exam'
import type { Locale } from '@/i18n/request'

const requestSchema = z.object({
  transcript: z.string().min(1),
  task_type: z.enum(['planning', 'presentation', 'reaction']),
  task_topic: z.string().min(1),
  task_points: z.array(z.string()).min(1),
  level: z.enum(['A1', 'A2', 'B1']),
  sessionId: z.string().uuid().optional(),
})

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { transcript, task_type, task_topic, task_points, level, sessionId } = parsed.data

    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', user.id)
      .maybeSingle()
    const language = (profile?.preferred_language ?? 'de') as Locale

    const feedback = await scoreSprechen(
      level as ExamLevel,
      transcript,
      task_type,
      task_topic,
      task_points,
      language,
      { sessionId: sessionId ?? null, userId: user.id }
    )

    return NextResponse.json({
      success: true,
      score: feedback.score,
      criteria: feedback.criteria,
      feedback: feedback.comment,
    })
  } catch (error) {
    console.error('Sprechen scoring failed:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: 'Scoring failed. Please try again.' },
      { status: 500 }
    )
  }
}
