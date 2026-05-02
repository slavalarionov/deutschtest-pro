/**
 * PATCH /api/admin/economy/fixed-costs/[id]
 * Body: частичный апдейт полей fixed_cost.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { updateFixedCost } from '@/lib/economy/manual-entries'
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
  notes?: string | null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminOrResp = await requireAdminApi()
  if (adminOrResp instanceof Response) return adminOrResp

  if (!params.id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const patch: Parameters<typeof updateFixedCost>[1] = {}

  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (name.length === 0) {
      return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 })
    }
    patch.name = name
  }

  if (body.amountNative !== undefined) {
    const amount = Number(body.amountNative)
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'amountNative must be a non-negative number' }, { status: 400 })
    }
    patch.amountNative = amount
  }

  if (body.nativeCurrency !== undefined) {
    if (!CURRENCIES.includes(body.nativeCurrency as FixedCostCurrency)) {
      return NextResponse.json({ error: 'Invalid nativeCurrency' }, { status: 400 })
    }
    patch.nativeCurrency = body.nativeCurrency as FixedCostCurrency
  }

  if (body.period !== undefined) {
    if (!PERIODS.includes(body.period as FixedCostPeriod)) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
    }
    patch.period = body.period as FixedCostPeriod
  }

  if (body.category !== undefined) {
    if (!CATEGORIES.includes(body.category as FixedCostCategory)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }
    patch.category = body.category as FixedCostCategory
  }

  if (body.notes !== undefined) {
    patch.notes = body.notes === null ? null : String(body.notes)
  }

  try {
    await updateFixedCost(params.id, patch)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
