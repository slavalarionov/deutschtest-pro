import { NextRequest, NextResponse } from 'next/server'
import { customAlphabet } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'

// Lowercase alphanumeric slug — 36^10 ≈ 3.6e15 combinations.
const generatePublicId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)

type ErrorCode = 'unauthorized' | 'not_found' | 'forbidden'
type LoadResult =
  | { ok: false; code: ErrorCode }
  | { ok: true; session: { id: string; user_id: string; public_id: string | null; is_public: boolean }; supabase: ReturnType<typeof createServerClient> }

async function loadOwnedSession(sessionId: string): Promise<LoadResult> {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return { ok: false, code: 'unauthorized' }

  const supabase = createServerClient()
  const { data: session, error } = await supabase
    .from('exam_sessions')
    .select('id, user_id, public_id, is_public')
    .eq('id', sessionId)
    .maybeSingle()

  if (error || !session) return { ok: false, code: 'not_found' }
  if (session.user_id !== user.id) return { ok: false, code: 'forbidden' }

  return { ok: true, session, supabase }
}

function errorResponse(code: ErrorCode) {
  const status = code === 'unauthorized' ? 401 : code === 'not_found' ? 404 : 403
  return NextResponse.json({ success: false, code }, { status })
}

/**
 * POST — generate or return existing public_id. Idempotent: subsequent calls
 * return the same ID without writing.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const result = await loadOwnedSession(params.sessionId)
  if (!result.ok) return errorResponse(result.code)

  const { session, supabase } = result

  if (session.public_id) {
    return NextResponse.json({
      success: true,
      publicId: session.public_id,
      isPublic: session.is_public,
    })
  }

  // Retry once on the (extremely unlikely) collision.
  for (let attempt = 0; attempt < 2; attempt++) {
    const candidate = generatePublicId()
    const { data, error } = await supabase
      .from('exam_sessions')
      .update({ public_id: candidate })
      .eq('id', params.sessionId)
      .is('public_id', null)
      .select('public_id, is_public')
      .maybeSingle()

    if (!error && data?.public_id) {
      return NextResponse.json({
        success: true,
        publicId: data.public_id,
        isPublic: data.is_public,
      })
    }

    // Concurrent caller already set the id — re-read and return.
    const { data: refreshed } = await supabase
      .from('exam_sessions')
      .select('public_id, is_public')
      .eq('id', params.sessionId)
      .maybeSingle()

    if (refreshed?.public_id) {
      return NextResponse.json({
        success: true,
        publicId: refreshed.public_id,
        isPublic: refreshed.is_public,
      })
    }
  }

  return NextResponse.json({ success: false, code: 'generation_failed' }, { status: 500 })
}

/**
 * PATCH — toggle is_public. Accepts `{ isPublic: boolean }`.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { sessionId: string } },
) {
  const result = await loadOwnedSession(params.sessionId)
  if (!result.ok) return errorResponse(result.code)

  const body = await req.json().catch(() => null) as { isPublic?: unknown } | null
  if (!body || typeof body.isPublic !== 'boolean') {
    return NextResponse.json({ success: false, code: 'validation' }, { status: 400 })
  }

  const { error } = await result.supabase
    .from('exam_sessions')
    .update({ is_public: body.isPublic })
    .eq('id', params.sessionId)

  if (error) {
    return NextResponse.json({ success: false, code: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, isPublic: body.isPublic })
}
