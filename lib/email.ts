import { Resend } from 'resend'

export async function sendPasswordEmail({
  to,
  password,
  subject = 'Ihr DeutschTest.pro Passwort',
}: {
  to: string
  password: string
  subject?: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const from =
    process.env.EMAIL_FROM || 'DeutschTest.pro <onboarding@resend.dev>'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://deutschtest.pro'

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
    throw new Error(error.message)
  }
}
