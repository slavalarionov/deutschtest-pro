import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadRecommendations } from '@/lib/dashboard/recommendations'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const forceRefresh = url.searchParams.get('refresh') === '1'

  try {
    const data = await loadRecommendations(user.id, { forceRefresh })
    return NextResponse.json({ success: true, data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/dashboard/recommendations]', msg)
    return NextResponse.json(
      { success: false, error: 'Empfehlungen konnten nicht generiert werden.' },
      { status: 500 }
    )
  }
}
