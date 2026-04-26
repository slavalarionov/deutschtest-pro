/**
 * POST /api/feedback/submit
 * Body: { attempt_id: uuid, rating?: 1-5, message?: string }
 *
 * Пользовательский фидбэк к завершённой попытке. Один фидбэк на попытку
 * (UNIQUE index uq_feedback_attempt). Либо rating, либо message — одно
 * из двух обязательно.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/get-client-ip'

export const maxDuration = 10

const BodySchema = z
  .object({
    attempt_id: z.string().uuid(),
    rating: z.number().int().min(1).max(5).optional(),
    message: z.string().max(500).optional(),
  })
  .refine(
    (v) => v.rating !== undefined || (typeof v.message === 'string' && v.message.trim().length > 0),
    { message: 'validation_required' },
  )

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })
  }

  const ip = getClientIp(req) ?? 'unknown'
  const limit = rateLimit(`feedback:${ip}`, 20, 60 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests', code: 'rate_limited' }, { status: 429 })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'bad_request' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success) {
    const code = parsed.error.issues.some((i) => i.message === 'validation_required')
      ? 'validation_required'
      : 'bad_request'
    return NextResponse.json({ error: 'Validation failed', code }, { status: 400 })
  }

  const { attempt_id, rating, message } = parsed.data
  const trimmedMessage = message?.trim() || null

  const admin = createAdminClient()

  const { data: attempt, error: attemptErr } = await admin
    .from('user_attempts')
    .select('id, user_id, submitted_at')
    .eq('id', attempt_id)
    .maybeSingle()

  if (attemptErr || !attempt) {
    return NextResponse.json({ error: 'Attempt not found', code: 'not_found' }, { status: 404 })
  }

  if (attempt.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden', code: 'forbidden' }, { status: 403 })
  }

  if (!attempt.submitted_at) {
    return NextResponse.json(
      { error: 'Attempt not submitted', code: 'not_submitted' },
      { status: 409 },
    )
  }

  const { error: insertErr } = await admin.from('feedback').insert({
    user_id: user.id,
    attempt_id: attempt.id,
    rating: rating ?? null,
    message: trimmedMessage,
  })

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json(
        { error: 'Feedback already submitted', code: 'already_submitted' },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: 'Could not save feedback', code: 'server_error' },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}
