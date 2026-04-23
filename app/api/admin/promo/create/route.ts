/**
 * POST /api/admin/promo/create
 * Body: {
 *   code: string,
 *   modules_reward: int > 0,
 *   max_redemptions: int > 0 | null,
 *   valid_until: ISO-date | null,
 *   one_per_user: boolean
 * }
 *
 * Создаёт запись в promo_codes. code уникальный, приводим к uppercase перед
 * сохранением. Возвращает полную строку нового промокода.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminApi } from '@/lib/admin/require-admin'
import { createAdminClient } from '@/lib/supabase/admin'

interface Body {
  code?: string
  modules_reward?: number
  max_redemptions?: number | null
  valid_until?: string | null
  one_per_user?: boolean
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

  const rawCode = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
  if (!/^[A-Z0-9_-]{3,32}$/.test(rawCode)) {
    return NextResponse.json(
      { error: 'Код должен быть 3–32 символа: A-Z, 0-9, _ или -.' },
      { status: 400 },
    )
  }
  const reward = body.modules_reward
  if (typeof reward !== 'number' || !Number.isInteger(reward) || reward <= 0) {
    return NextResponse.json(
      { error: 'modules_reward должен быть положительным целым числом.' },
      { status: 400 },
    )
  }
  const maxRed =
    body.max_redemptions === null || body.max_redemptions === undefined
      ? null
      : Number(body.max_redemptions)
  if (maxRed !== null && (!Number.isInteger(maxRed) || maxRed <= 0)) {
    return NextResponse.json(
      { error: 'max_redemptions — положительное число или null.' },
      { status: 400 },
    )
  }
  const validUntilStr = typeof body.valid_until === 'string' ? body.valid_until : null
  let validUntil: string | null = null
  if (validUntilStr) {
    const d = new Date(validUntilStr)
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'valid_until — невалидная дата.' }, { status: 400 })
    }
    validUntil = d.toISOString()
  }

  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('promo_codes')
    .select('id')
    .eq('code', rawCode)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Такой код уже есть.' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('promo_codes')
    .insert({
      code: rawCode,
      modules_reward: reward,
      max_redemptions: maxRed,
      valid_until: validUntil,
      one_per_user: Boolean(body.one_per_user ?? true),
      is_active: true,
      created_by: adminOrResp.id,
    })
    .select(
      'id, code, modules_reward, max_redemptions, current_redemptions, valid_until, one_per_user, is_active, created_at',
    )
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'insert failed' }, { status: 500 })
  }

  return NextResponse.json({ promo: data })
}
