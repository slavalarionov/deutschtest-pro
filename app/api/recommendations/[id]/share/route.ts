import { NextRequest, NextResponse } from 'next/server'
import { customAlphabet } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'

// Same alphabet as /api/exam/[sessionId]/share — keep public_id space consistent
// across both kinds of public artifacts.
const generatePublicId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10)

type ErrorCode = 'unauthorized' | 'not_found' | 'forbidden'
type LoadResult =
  | { ok: false; code: ErrorCode }
  | {
      ok: true
      row: { id: string; user_id: string; public_id: string | null; is_public: boolean }
      supabase: ReturnType<typeof createServerClient>
    }

async function loadOwnedRecommendation(id: string): Promise<LoadResult> {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return { ok: false, code: 'unauthorized' }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('user_recommendations')
    .select('id, user_id, public_id, is_public')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return { ok: false, code: 'not_found' }
  if (data.user_id !== user.id) return { ok: false, code: 'forbidden' }

  return { ok: true, row: data, supabase }
}

function errorResponse(code: ErrorCode) {
  const status = code === 'unauthorized' ? 401 : code === 'not_found' ? 404 : 403
  return NextResponse.json({ success: false, code }, { status })
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const result = await loadOwnedRecommendation(params.id)
  if (!result.ok) return errorResponse(result.code)

  const { row, supabase } = result

  if (row.public_id) {
    return NextResponse.json({
      success: true,
      publicId: row.public_id,
      isPublic: row.is_public,
    })
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const candidate = generatePublicId()
    const { data, error } = await supabase
      .from('user_recommendations')
      .update({ public_id: candidate })
      .eq('id', params.id)
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

    const { data: refreshed } = await supabase
      .from('user_recommendations')
      .select('public_id, is_public')
      .eq('id', params.id)
      .maybeSingle()

    if (refreshed?.public_id) {
      return NextResponse.json({
        success: true,
        publicId: refreshed.public_id,
        isPublic: refreshed.is_public,
      })
    }
  }

  return NextResponse.json(
    { success: false, code: 'generation_failed' },
    { status: 500 },
  )
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const result = await loadOwnedRecommendation(params.id)
  if (!result.ok) return errorResponse(result.code)

  const body = await req.json().catch(() => null) as { isPublic?: unknown } | null
  if (!body || typeof body.isPublic !== 'boolean') {
    return NextResponse.json({ success: false, code: 'validation' }, { status: 400 })
  }

  const { error } = await result.supabase
    .from('user_recommendations')
    .update({ is_public: body.isPublic })
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ success: false, code: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true, isPublic: body.isPublic })
}
