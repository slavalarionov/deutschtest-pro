// server-only — must NEVER be imported in client components.
// Resend wrapper for transactional email. Templates live in lib/email/templates/
// as plain HTML with a {{CONFIRMATION_URL}} placeholder.
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Resend } from 'resend'

export type EmailLocale = 'de' | 'ru' | 'en' | 'tr'

const CONFIRMATION_SUBJECTS: Record<EmailLocale, string> = {
  de: 'Bestätigen Sie Ihre Registrierung — DeutschTest.pro',
  ru: 'Подтвердите регистрацию — DeutschTest.pro',
  en: 'Confirm your registration — DeutschTest.pro',
  tr: 'Kaydınızı onaylayın — DeutschTest.pro',
}

let resendClient: Resend | null = null
function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

const templateCache = new Map<EmailLocale, string>()
async function loadConfirmationTemplate(locale: EmailLocale): Promise<string> {
  const cached = templateCache.get(locale)
  if (cached) return cached
  const file = path.join(
    process.cwd(),
    'lib',
    'email',
    'templates',
    `confirmation-${locale}.html`,
  )
  const html = await readFile(file, 'utf8')
  templateCache.set(locale, html)
  return html
}

export async function sendConfirmationEmail(
  email: string,
  confirmationUrl: string,
  language: EmailLocale,
): Promise<void> {
  const from = process.env.EMAIL_FROM || 'DeutschTest.pro <noreply@deutschtest.pro>'
  const template = await loadConfirmationTemplate(language)
  const html = template.replace('{{CONFIRMATION_URL}}', confirmationUrl)

  const { error } = await getResend().emails.send({
    from,
    to: email,
    subject: CONFIRMATION_SUBJECTS[language],
    html,
  })
  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? String(error)}`)
  }
}
