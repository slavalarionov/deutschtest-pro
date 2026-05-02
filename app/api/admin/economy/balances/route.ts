/**
 * POST /api/admin/economy/balances
 * Body: { provider: 'anthropic' | 'openai' | 'elevenlabs', balanceUsd: number, notes?: string }
 *
 * Записывает текущий баланс провайдера. История накапливается — DELETE не делаем.
 *
 * GET /api/admin/economy/balances?provider=...
 * Возвращает последние 20 записей по провайдеру для модалки «История».
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import {
  recordProviderBalance,
  listProviderBalanceHistory,
  type ProviderForBalance,
} from '@/lib/economy/manual-entries'

const PROVIDERS: ReadonlyArray<ProviderForBalance> = ['anthropic', 'openai', 'elevenlabs']

interface PostBody {
  provider?: string
  balanceUsd?: number | string
  notes?: string
}

export async function POST(req: NextRequest) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  let body: PostBody
  try {
    body = (await req.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const provider = body.provider as ProviderForBalance | undefined
  if (!provider || !PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const balance = Number(body.balanceUsd)
  if (!Number.isFinite(balance) || balance < 0) {
    return NextResponse.json({ error: 'balanceUsd must be a non-negative number' }, { status: 400 })
  }

  try {
    await recordProviderBalance({
      provider,
      balanceUsd: balance,
      notes: typeof body.notes === 'string' && body.notes.length > 0 ? body.notes : undefined,
      recordedBy: adminOrResp.email,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  const provider = req.nextUrl.searchParams.get('provider') as ProviderForBalance | null
  if (!provider || !PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
  }

  const history = await listProviderBalanceHistory(provider, 20)
  return NextResponse.json({
    history: history.map((row) => ({
      balanceUsd: row.balanceUsd,
      recordedAt: row.recordedAt.toISOString(),
      notes: row.notes,
      recordedBy: row.recordedBy,
    })),
  })
}
