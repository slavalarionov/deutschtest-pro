/**
 * POST /api/promo/redeem
 * Body: { code: string }
 *
 * Активирует промокод для авторизованного пользователя.
 *
 * Последовательность:
 *   1. Auth check.
 *   2. Rate-limit: 5 попыток в час на IP.
 *   3. Загружаем промокод по uppercase(code) через service role.
 *   4. Проверяем is_active, valid_until, max_redemptions, one_per_user.
 *   5. Инсёртим promo_redemptions (FK на promo_codes + user) — если one_per_user
 *      и запись уже есть, unique constraint выкинет 23505.
 *   6. Инкрементим current_redemptions.
 *   7. Начисляем модули в profiles.modules_balance + пишем modules_ledger с
 *      reason=`promo:<CODE>`.
 *
 * Все ошибки валидации и бизнеса возвращаем как { error, code } чтобы клиент мог
 * показать человечное сообщение. На внутренних сбоях — 500 с generic message.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/get-client-ip'

interface Body {
  code?: string
}

interface PromoRow {
  id: string
  code: string
  modules_reward: number
  max_redemptions: number | null
  current_redemptions: number | null
  valid_until: string | null
  one_per_user: boolean | null
  is_active: boolean | null
}

export const maxDuration = 10

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Нужно войти в аккаунт.', code: 'unauthorized' },
      { status: 401 },
    )
  }

  const ip = getClientIp(req) ?? 'unknown'
  const limit = rateLimit(`promo:${ip}`, 5, 60 * 60 * 1000)
  if (!limit.allowed) {
    const resetIn = Math.max(0, Math.ceil((limit.resetAt - Date.now()) / 1000 / 60))
    return NextResponse.json(
      {
        error: `Слишком много попыток. Попробуйте через ${resetIn} мин.`,
        code: 'rate_limited',
      },
      { status: 429 },
    )
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'bad_request' }, { status: 400 })
  }

  const normalized = typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
  if (!/^[A-Z0-9_-]{3,32}$/.test(normalized)) {
    return NextResponse.json(
      { error: 'Код некорректный.', code: 'invalid_code_format' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const { data: promoRow, error: promoErr } = await admin
    .from('promo_codes')
    .select(
      'id, code, modules_reward, max_redemptions, current_redemptions, valid_until, one_per_user, is_active',
    )
    .eq('code', normalized)
    .maybeSingle()

  if (promoErr) {
    return NextResponse.json(
      { error: 'Не удалось проверить промокод.', code: 'server_error' },
      { status: 500 },
    )
  }

  if (!promoRow) {
    return NextResponse.json(
      { error: 'Промокод не найден.', code: 'not_found' },
      { status: 404 },
    )
  }

  const promo = promoRow as PromoRow

  if (!promo.is_active) {
    return NextResponse.json(
      { error: 'Промокод отключён.', code: 'inactive' },
      { status: 410 },
    )
  }

  if (promo.valid_until && new Date(promo.valid_until).getTime() < Date.now()) {
    return NextResponse.json(
      { error: 'Срок действия истёк.', code: 'expired' },
      { status: 410 },
    )
  }

  const current = promo.current_redemptions ?? 0
  if (promo.max_redemptions !== null && current >= promo.max_redemptions) {
    return NextResponse.json(
      { error: 'Лимит активаций исчерпан.', code: 'limit_reached' },
      { status: 409 },
    )
  }

  if (promo.one_per_user !== false) {
    const { data: existing } = await admin
      .from('promo_redemptions')
      .select('id')
      .eq('promo_id', promo.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'Вы уже использовали этот промокод.', code: 'already_redeemed' },
        { status: 409 },
      )
    }
  }

  const { error: redemptionErr } = await admin.from('promo_redemptions').insert({
    promo_id: promo.id,
    user_id: user.id,
    modules_granted: promo.modules_reward,
  })

  if (redemptionErr) {
    // Race: если уникальный индекс поймал одновременную активацию — сообщаем
    // пользователю то же, что при предыдущей проверке.
    if (redemptionErr.code === '23505') {
      return NextResponse.json(
        { error: 'Вы уже использовали этот промокод.', code: 'already_redeemed' },
        { status: 409 },
      )
    }
    return NextResponse.json(
      { error: 'Не удалось зарегистрировать активацию.', code: 'server_error' },
      { status: 500 },
    )
  }

  // Инкремент current_redemptions. В одном вызове, но без транзакции — допустимое
  // расхождение счётчика между реальным числом записей и значением в поле при
  // гонке. В UI показываем число строк из promo_redemptions, это источник правды.
  await admin
    .from('promo_codes')
    .update({ current_redemptions: current + 1 })
    .eq('id', promo.id)

  const { data: profile } = await admin
    .from('profiles')
    .select('modules_balance')
    .eq('id', user.id)
    .single()

  const newBalance = (profile?.modules_balance ?? 0) + promo.modules_reward
  await admin.from('profiles').update({ modules_balance: newBalance }).eq('id', user.id)

  await admin.from('modules_ledger').insert({
    user_id: user.id,
    delta: promo.modules_reward,
    reason: `promo:${promo.code}`,
    related_promo_id: promo.id,
    performed_by: null,
  })

  return NextResponse.json({
    ok: true,
    modules_granted: promo.modules_reward,
    new_balance: newBalance,
  })
}
