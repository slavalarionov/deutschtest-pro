/**
 * Server-only helpers to push notifications into the admin's personal
 * Telegram chat (single-recipient bot — no inbound handling, no webhook).
 *
 * Fail-safe by design: any failure (missing env, network, Telegram 4xx/5xx)
 * is logged and swallowed. Caller flows — registration confirm, payment
 * webhook — must never break because Telegram is unreachable.
 *
 * Configure TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID in env (locally
 * in `.env.local`, in prod via Timeweb App env).
 */
import { createAdminClient } from '@/lib/supabase/admin'

const TELEGRAM_API_BASE = 'https://api.telegram.org'

export async function sendAdminTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID

  if (!token || !chatId) {
    console.warn(
      '[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not set — skipping',
    )
    return
  }

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[telegram] sendMessage failed', {
        status: res.status,
        body: body.slice(0, 200),
      })
    }
  } catch (e) {
    console.error(
      '[telegram] sendMessage error',
      e instanceof Error ? e.message : e,
    )
  }
}

export interface NotifyPaymentInput {
  paymentId: string
  userId: string
  modulesCredited: number
}

/**
 * Format-and-send a "payment received" admin notification. Pulls package /
 * amount / email from the DB; falls back to userId if profile is missing.
 */
export async function notifyAdminOnPayment(
  input: NotifyPaymentInput,
): Promise<void> {
  try {
    const admin = createAdminClient()
    const [{ data: payment }, { data: profile }] = await Promise.all([
      admin
        .from('payments')
        .select(
          'package_id, package_size, amount_currency, amount_minor, promo_bonus_modules',
        )
        .eq('id', input.paymentId)
        .maybeSingle(),
      admin
        .from('profiles')
        .select('email, modules_balance')
        .eq('id', input.userId)
        .maybeSingle(),
    ])

    const email = profile?.email ?? input.userId
    const pkg = payment?.package_id ?? '—'
    const currency = payment?.amount_currency ?? ''
    const amountMajor =
      payment?.amount_minor != null
        ? (payment.amount_minor / 100).toLocaleString('ru-RU', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })
        : '—'
    const balance = profile?.modules_balance ?? 0
    const bonus = payment?.promo_bonus_modules ?? 0
    const bonusLine = bonus > 0 ? ` (включая ${bonus} бонусных)` : ''

    const text = [
      '💰 Оплата получена',
      email,
      `Пакет: ${pkg}`,
      `Сумма: ${amountMajor} ${currency}`,
      `+${input.modulesCredited} модулей${bonusLine} · баланс: ${balance}`,
    ].join('\n')

    await sendAdminTelegram(text)
  } catch (e) {
    console.error(
      '[telegram] notifyAdminOnPayment error',
      e instanceof Error ? e.message : e,
    )
  }
}
