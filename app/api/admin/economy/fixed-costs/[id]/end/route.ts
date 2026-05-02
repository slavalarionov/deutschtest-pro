/**
 * POST /api/admin/economy/fixed-costs/[id]/end
 * Body: { endedAt?: 'YYYY-MM-DD' }   // опционально, default = today
 *
 * Soft-end: проставляем ended_at, чтобы расход выпал из активных,
 * но запись осталась в истории.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { endFixedCost } from '@/lib/economy/manual-entries'

interface Body {
  endedAt?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  if (!params.id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  let body: Body = {}
  try {
    body = (await req.json().catch(() => ({}))) as Body
  } catch {
    body = {}
  }

  let endedAt: Date
  if (typeof body.endedAt === 'string' && body.endedAt.length > 0) {
    endedAt = new Date(body.endedAt)
    if (Number.isNaN(endedAt.getTime())) {
      return NextResponse.json({ error: 'Invalid endedAt' }, { status: 400 })
    }
  } else {
    endedAt = new Date()
  }

  try {
    await endFixedCost(params.id, endedAt)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
