import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadDashboardStats } from '@/lib/dashboard/stats'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stats = await loadDashboardStats(user.id)
  return NextResponse.json({ success: true, stats })
}
