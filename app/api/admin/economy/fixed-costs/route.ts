/**
 * POST /api/admin/economy/fixed-costs
 * Body: { name, amountNative, nativeCurrency, period, category, startedAt?, notes? }
 *
 * Создаёт активный fixed_cost. Валидация — на типе колонок CHECK CONSTRAINT
 * (миграция 038): native_currency, period, category. Здесь дублируем,
 * чтобы вернуть 400 раньше похода в БД.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createFixedCost } from '@/lib/economy/manual-entries'
import type {
  FixedCostCategory,
  FixedCostCurrency,
  FixedCostPeriod,
} from '@/lib/economy/fixed-costs'

const CURRENCIES: readonly FixedCostCurrency[] = ['USD', 'RUB', 'EUR']
const PERIODS: readonly FixedCostPeriod[] = ['monthly', 'yearly', 'one_time']
const CATEGORIES: readonly FixedCostCategory[] = [
  'hosting',
  'database',
  'cdn',
  'email',
  'ai_subscription',
  'domain',
  'other',
]

interface Body {
  name?: string
  amountNative?: number | string
  nativeCurrency?: string
  period?: string
  category?: string
  startedAt?: string
  notes?: string
}

export async function POST(req: NextRequest) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (name.length === 0) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const amount = Number(body.amountNative)
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: 'amountNative must be a non-negative number' }, { status: 400 })
  }

  if (!CURRENCIES.includes(body.nativeCurrency as FixedCostCurrency)) {
    return NextResponse.json({ error: 'Invalid nativeCurrency' }, { status: 400 })
  }
  if (!PERIODS.includes(body.period as FixedCostPeriod)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
  }
  if (!CATEGORIES.includes(body.category as FixedCostCategory)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  try {
    const created = await createFixedCost({
      name,
      amountNative: amount,
      nativeCurrency: body.nativeCurrency as FixedCostCurrency,
      period: body.period as FixedCostPeriod,
      category: body.category as FixedCostCategory,
      startedAt: typeof body.startedAt === 'string' && body.startedAt.length > 0 ? body.startedAt : undefined,
      notes: typeof body.notes === 'string' && body.notes.length > 0 ? body.notes : undefined,
    })
    return NextResponse.json({ id: created.id })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
