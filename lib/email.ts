import '@/lib/ensure-resend-user-agent'
import { Resend } from 'resend'

const DEFAULT_FROM = 'DeutschTest.pro <onboarding@resend.dev>'

/** Vercel UI sometimes stores extra quotes; strip them. */
function parseEmailFromEnv(): { from: string; explicitlySet: boolean } {
  const raw = process.env.EMAIL_FROM
  if (raw == null || raw.trim() === '') {
    return { from: DEFAULT_FROM, explicitlySet: false }
  }
  let v = raw.trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim()
  }
  return { from: v || DEFAULT_FROM, explicitlySet: true }
}

export async function sendPasswordEmail({
  to,
  password,
  subject = 'Ihr DeutschTest.pro Passwort',
}: {
  to: string
  password: string
  subject?: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const { from, explicitlySet } = parseEmailFromEnv()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://deutschtest.pro'

  // onboarding@resend.dev only allows sending to your own Resend-account email — useless on production.
  const isProd = process.env.VERCEL_ENV === 'production'
  if (isProd && (!explicitlySet || from.includes('@resend.dev'))) {
    throw new Error(
      'EMAIL_FROM is not set for production. In Vercel add EMAIL_FROM = "DeutschTest.pro <noreply@yourdomain.com>" using an address on a domain you verified in Resend.'
    )
  }

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html: `
      <h1>Willkommen bei DeutschTest.pro!</h1>
      <p>Ihr automatisch generiertes Passwort:</p>
      <p style="font-size: 24px; font-weight: bold; background: #f4f4f4; padding: 16px; border-radius: 8px;">
        ${password}
      </p>
      <p>Sie können sich jetzt einloggen: <a href="${baseUrl}/login">${baseUrl}/login</a></p>
      <p><small>Tipp: Ändern Sie Ihr Passwort nach dem ersten Login, falls Ihr Konto diese Funktion unterstützt.</small></p>
    `,
  })

  if (error) {
    const err = error as { name?: string; message?: string }
    const name = err.name ?? 'unknown'
    const msg = err.message ?? 'Unknown Resend error'
    console.error('[email] Resend send failed:', JSON.stringify(error))
    console.error('[email] from used:', from.replace(/<[^>]+>/, '<…>'))
    throw new Error(`[resend:${name}] ${msg}`)
  }
}
