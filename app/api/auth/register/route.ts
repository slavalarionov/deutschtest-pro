import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient as createSupabaseAdmin } from '@/lib/supabase-server'
import { createClient as createSupabaseSSR } from '@/lib/supabase/server'
import { normalizeEmail } from '@/lib/email-normalize'
import { rateLimit, getClientIp } from '@/lib/rate-limit'

const REGISTER_API_HEADER = 'X-Deutschtest-Register-Api'
const REGISTER_API_VALUE = 'v3-signup-confirm'

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen enthalten'),
  turnstileToken: z.string().optional(),
})

function registerJson(body: object, init?: ResponseInit) {
  const h = new Headers(init?.headers)
  h.set(REGISTER_API_HEADER, REGISTER_API_VALUE)
  return NextResponse.json(body, { ...init, headers: h })
}

export async function GET() {
  return registerJson({
    registerApi: REGISTER_API_VALUE,
    builtAt: new Date().toISOString(),
  })
}

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    // Ключи не настроены — режим «пока без капчи», логируем и пропускаем.
    console.warn('[register] TURNSTILE_SECRET_KEY not set — skipping captcha verification')
    return true
  }
  if (!token) return false

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch (e) {
    console.error('[register] turnstile verify error:', e instanceof Error ? e.message : e)
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers)
    const limit = rateLimit(`register:${ip}`, 3, 60 * 60 * 1000)
    if (!limit.allowed) {
      const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000))
      return registerJson(
        {
          error:
            'Zu viele Registrierungsversuche von Ihrer IP. Bitte versuchen Sie es später erneut.',
        },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )
    }

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      return registerJson(
        { error: first?.message || 'Ungültige Eingabe' },
        { status: 400 },
      )
    }

    const { email: rawEmail, password, turnstileToken } = parsed.data

    const captchaOk = await verifyTurnstile(turnstileToken, ip)
    if (!captchaOk) {
      return registerJson(
        { error: 'Captcha-Prüfung fehlgeschlagen. Bitte laden Sie die Seite neu.' },
        { status: 400 },
      )
    }

    const email = rawEmail.trim().toLowerCase()
    const normalized = normalizeEmail(email)

    // Pre-check: ищем существующий аккаунт с тем же нормализованным email.
    // Для Gmail это ловит j.o.h.n@gmail.com vs john@gmail.com.
    const admin = createSupabaseAdmin()
    const { data: existingUsers, error: listError } = await admin.auth.admin.listUsers({
      perPage: 1000,
    })
    if (listError) {
      console.error('[register] listUsers:', listError.message)
      return registerJson({ error: 'Serverfehler bei der Registrierung' }, { status: 500 })
    }

    const duplicate = existingUsers?.users.some(
      (u) => u.email && normalizeEmail(u.email) === normalized,
    )
    if (duplicate) {
      return registerJson(
        { error: 'Diese E-Mail ist bereits registriert.' },
        { status: 409 },
      )
    }

    // Стандартный signUp: Supabase сам пришлёт confirmation email, юзер подтвердит
    // через /auth/callback, `email_confirmed_at` проставится только после клика.
    const supabase = await createSupabaseSSR()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback`,
      },
    })

    if (signUpError) {
      const msg = signUpError.message || 'Registrierung fehlgeschlagen'
      // Supabase возвращает 422 для «User already registered» — мапим на 409 для клиента.
      const status = /already registered|already exists/i.test(msg) ? 409 : 400
      const clientMsg = status === 409 ? 'Diese E-Mail ist bereits registriert.' : msg
      return registerJson({ error: clientMsg }, { status })
    }

    return registerJson({
      success: true,
      message:
        'Bitte bestätigen Sie Ihre E-Mail-Adresse über den Link, den wir Ihnen gesendet haben.',
    })
  } catch (e) {
    console.error('[register]', e instanceof Error ? e.message : e)
    return registerJson({ error: 'Serverfehler bei der Registrierung' }, { status: 500 })
  }
}
