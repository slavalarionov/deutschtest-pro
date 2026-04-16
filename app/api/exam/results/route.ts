import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { createClient } from '@/lib/supabase/server'
import { getModulesBalance } from '@/lib/billing'

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ success: false, error: 'Missing sessionId' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: attempt, error: attemptError } = await supabase
    .from('user_attempts')
    .select('*')
    .eq('session_id', sessionId)
    .single()

  if (attemptError || !attempt) {
    return NextResponse.json({ success: false, error: 'Results not found' }, { status: 404 })
  }

  const { data: session, error: sessionError } = await supabase
    .from('exam_sessions')
    .select('level, mode')
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
  }

  let modulesBalance = 0
  try {
    const authSupabase = await createClient()
    const { data: { user } } = await authSupabase.auth.getUser()
    if (user) {
      modulesBalance = await getModulesBalance(user.id)
    }
  } catch { /* non-critical */ }

  return NextResponse.json({
    success: true,
    level: session.level,
    mode: session.mode,
    scores: attempt.scores,
    aiFeedback: attempt.ai_feedback,
    submittedAt: attempt.submitted_at,
    modulesBalance,
  })
}
