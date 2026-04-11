import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession, deleteSession } from '@/lib/session-store'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'

const bodySchema = z.object({
  sessionId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Nicht autorisiert' }, { status: 401 })
    }

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid body' }, { status: 400 })
    }

    const { sessionId } = parsed.data
    const stored = await getSession(sessionId)

    if (!stored || stored.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 })
    }

    const supabase = createServerClient()
    await supabase.from('user_attempts').delete().eq('session_id', sessionId)
    await deleteSession(sessionId)

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('reset-session:', e instanceof Error ? e.message : e)
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 })
  }
}
