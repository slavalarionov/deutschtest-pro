import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadUserHistory, parseHistoryFilters } from '@/lib/dashboard/history'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const filters = parseHistoryFilters(req.nextUrl.searchParams)
  const items = await loadUserHistory(user.id, filters)

  return NextResponse.json({ success: true, items })
}
