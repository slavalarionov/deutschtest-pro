/**
 * Sends a "payment received" notification.
 *
 * Minimal implementation: looks up the payment + user, formats a plain HTML
 * letter through Resend. Locale picked from `payments.locale_at_purchase`.
 * If RESEND_API_KEY is missing, logs and returns — failure must NOT block
 * the webhook (deduplication is in DB, the email can be retried manually).
 */
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

export interface SendPaymentSuccessInput {
  paymentId: string
  userId: string
}

const SUBJECTS = {
  ru: 'Платёж принят — DeutschTest.pro',
  de: 'Zahlung bestätigt — DeutschTest.pro',
  en: 'Payment received — DeutschTest.pro',
  tr: 'Ödeme alındı — DeutschTest.pro',
} as const

let resendClient: Resend | null = null
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  if (!resendClient) resendClient = new Resend(apiKey)
  return resendClient
}

function renderHtml(locale: keyof typeof SUBJECTS, modules: number, balance: number): string {
  const lines: Record<keyof typeof SUBJECTS, { greet: string; body: string; cta: string }> = {
    ru: {
      greet: 'Здравствуйте!',
      body: `Платёж прошёл успешно. На ваш баланс зачислено <strong>${modules} модулей</strong>. Текущий баланс: <strong>${balance}</strong>.`,
      cta: 'Перейти в личный кабинет',
    },
    de: {
      greet: 'Hallo!',
      body: `Ihre Zahlung war erfolgreich. <strong>${modules} Module</strong> wurden Ihrem Guthaben gutgeschrieben. Aktueller Stand: <strong>${balance}</strong>.`,
      cta: 'Zum Dashboard',
    },
    en: {
      greet: 'Hi!',
      body: `Your payment was successful. <strong>${modules} modules</strong> were credited to your balance. Current balance: <strong>${balance}</strong>.`,
      cta: 'Open dashboard',
    },
    tr: {
      greet: 'Merhaba!',
      body: `Ödemeniz başarılı oldu. Bakiyenize <strong>${modules} modül</strong> eklendi. Güncel bakiye: <strong>${balance}</strong>.`,
      cta: 'Panele git',
    },
  }
  const t = lines[locale]
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://deutschtest.pro'
  return `
<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:480px;margin:24px auto;color:#111">
<p style="font-size:18px">${t.greet}</p>
<p style="font-size:16px;line-height:1.5">${t.body}</p>
<p><a href="${appUrl}/${locale === 'de' ? '' : `${locale}/`}dashboard" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;border-radius:24px;text-decoration:none;font-size:14px">${t.cta}</a></p>
<hr style="margin-top:32px;border:none;border-top:1px solid #eee"/>
<p style="font-size:12px;color:#888">DeutschTest.pro · AI-симулятор Goethe-Zertifikat</p>
</body></html>`
}

export async function sendPaymentSuccessEmail(
  input: SendPaymentSuccessInput,
): Promise<void> {
  const resend = getResend()
  if (!resend) {
    console.warn('[payment-email] RESEND_API_KEY missing, skipping')
    return
  }

  const admin = createAdminClient()
  const [{ data: payment }, { data: profile }] = await Promise.all([
    admin
      .from('payments')
      .select('package_size, promo_bonus_modules, locale_at_purchase')
      .eq('id', input.paymentId)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('email, modules_balance')
      .eq('id', input.userId)
      .maybeSingle(),
  ])

  if (!payment || !profile?.email) {
    console.warn('[payment-email] payment or profile not found', input)
    return
  }

  const locale = (payment.locale_at_purchase as keyof typeof SUBJECTS) ?? 'ru'
  const total = (payment.package_size ?? 0) + (payment.promo_bonus_modules ?? 0)
  const balance = profile.modules_balance ?? 0
  const html = renderHtml(locale, total, balance)
  const from = process.env.EMAIL_FROM || 'DeutschTest.pro <noreply@deutschtest.pro>'

  const { error } = await resend.emails.send({
    from,
    to: profile.email,
    subject: SUBJECTS[locale],
    html,
  })
  if (error) {
    console.error('[payment-email] Resend error', error)
  }
}
