import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase-server'
import { generateSecurePassword } from '@/lib/utils'
import { sendPasswordEmail } from '@/lib/email'

/** Sent on every response so you can verify production runs this file (Network tab or GET). */
const REGISTER_API_HEADER = 'X-Deutschtest-Register-Api'
const REGISTER_API_VALUE = 'v2-admin-resend'

const bodySchema = z.object({
  email: z.string().email(),
})

function registerJson(body: object, init?: ResponseInit) {
  const h = new Headers(init?.headers)
  h.set(REGISTER_API_HEADER, REGISTER_API_VALUE)
  return NextResponse.json(body, { ...init, headers: h })
}

/** Open in browser: must return JSON with registerApi v2. If 405/404, production is an old/other deployment. */
export async function GET() {
  return registerJson({
    registerApi: REGISTER_API_VALUE,
    builtAt: new Date().toISOString(),
  })
}

function resendHintDe(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('resend_api_key') || m.includes('not configured')) {
    return 'E-Mail-Dienst ist auf dem Server nicht konfiguriert (RESEND_API_KEY).'
  }
  if (m.includes('only send testing emails') || m.includes('verify a domain')) {
    return 'Resend: Bitte eine verifizierte Absender-Domain einrichten (EMAIL_FROM). Mit onboarding@resend.dev sind oft nur Test-E-Mails an Ihre eigene Adresse möglich.'
  }
  if (m.includes('email_from is not set for production')) {
    return 'In Vercel → Settings → Environment Variables (Production): EMAIL_FROM = "DeutschTest.pro <noreply@deutschtest.pro>" — dieselbe Domain muss in Resend unter Domains als "Verified" stehen.'
  }
  if (m.includes('invalid') && m.includes('from')) {
    return 'Ungültiger Absender (EMAIL_FROM). Domain muss bei Resend verifiziert sein.'
  }
  return message
}

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return registerJson({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 })
    }

    const { email } = parsed.data
    const password = generateSecurePassword(12)
    const admin = createServerClient()

    const { data: created, error: signUpError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (signUpError) {
      return registerJson({ error: signUpError.message }, { status: 400 })
    }

    const userId = created.user?.id
    if (!userId) {
      return registerJson({ error: 'Benutzer konnte nicht angelegt werden' }, { status: 500 })
    }

    try {
      await sendPasswordEmail({ to: email, password })
    } catch (mailErr) {
      const raw = mailErr instanceof Error ? mailErr.message : String(mailErr)
      console.error('[register] sendPasswordEmail:', raw)

      try {
        await admin.auth.admin.deleteUser(userId)
      } catch (delErr) {
        console.error('[register] rollback deleteUser:', delErr instanceof Error ? delErr.message : delErr)
      }

      return registerJson(
        {
          error: `Die Registrierung wurde nicht abgeschlossen, weil das Passwort nicht per E-Mail zugestellt werden konnte. ${resendHintDe(raw)}`,
          code: 'email_send_failed',
        },
        { status: 502 }
      )
    }

    return registerJson({
      success: true,
      message: 'Ein Passwort wurde an Ihre E-Mail gesendet.',
    })
  } catch (e) {
    console.error('[register]', e instanceof Error ? e.message : e)
    return registerJson({ error: 'Serverfehler bei der Registrierung' }, { status: 500 })
  }
}
