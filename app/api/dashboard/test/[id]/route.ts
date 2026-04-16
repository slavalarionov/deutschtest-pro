import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadTestDetails } from '@/lib/dashboard/test-details'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await loadTestDetails(user.id, params.id)

  if (!result.ok) {
    const status =
      result.reason === 'forbidden'
        ? 403
        : result.reason === 'not_submitted'
          ? 409
          : 404
    return NextResponse.json(
      { success: false, error: result.reason },
      { status }
    )
  }

  return NextResponse.json({ success: true, details: result.details })
}
