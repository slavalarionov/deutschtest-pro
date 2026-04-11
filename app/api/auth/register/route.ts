import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { generateSecurePassword } from '@/lib/utils'
import { sendPasswordEmail } from '@/lib/email'

const bodySchema = z.object({
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 })
    }

    const { email } = parsed.data
    const password = generateSecurePassword(12)
    const supabase = await createClient()

    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000'

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin.replace(/\/$/, '')}/auth/callback`,
      },
    })

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 })
    }

    try {
      await sendPasswordEmail({ to: email, password })
    } catch (mailErr) {
      console.error('[register] sendPasswordEmail:', mailErr instanceof Error ? mailErr.message : mailErr)
      return NextResponse.json(
        {
          error:
            'Konto wurde angelegt, aber der E-Mail-Versand ist fehlgeschlagen. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Ein Passwort wurde an Ihre E-Mail gesendet.',
    })
  } catch (e) {
    console.error('[register]', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Serverfehler bei der Registrierung' }, { status: 500 })
  }
}
