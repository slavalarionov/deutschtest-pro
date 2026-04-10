import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { scoreSprechen } from '@/lib/claude'
import type { ExamLevel } from '@/types/exam'

const requestSchema = z.object({
  transcript: z.string().min(1),
  task_type: z.enum(['planning', 'presentation', 'reaction']),
  task_topic: z.string().min(1),
  task_points: z.array(z.string()).min(1),
  level: z.enum(['A1', 'A2', 'B1']),
})

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { transcript, task_type, task_topic, task_points, level } = parsed.data

    const feedback = await scoreSprechen(
      level as ExamLevel,
      transcript,
      task_type,
      task_topic,
      task_points
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
