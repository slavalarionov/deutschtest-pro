import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient as createSupabaseAdmin } from '@/lib/supabase-server'
import { normalizeEmail } from '@/lib/email-normalize'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/get-client-ip'
import { sendConfirmationEmail, type EmailLocale } from '@/lib/email'

const REGISTER_API_HEADER = 'X-Deutschtest-Register-Api'
const REGISTER_API_VALUE = 'v4-resend-confirm'

// Версия юридических документов на момент текущего деплоя.
// При обновлении terms/privacy/offer/impressum — поднять дату и попросить
// существующих пользователей повторно акцептовать (отдельный спринт).
const TERMS_VERSION = '2026-04-28'

const bodySchema = z.object({
  name: z.string().trim().max(50).optional(),
  email: z.string().email(),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen enthalten'),
  consent: z.literal(true, {
    errorMap: () => ({
      message:
        'Sie müssen den Nutzungsbedingungen und der Datenschutzerklärung zustimmen.',
    }),
  }),
  turnstileToken: z.string().optional(),
  preferredLanguage: z.enum(['de', 'ru', 'en', 'tr']).optional(),
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
    const ip = getClientIp(req) ?? 'unknown'
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

    const { name, email: rawEmail, password, turnstileToken, preferredLanguage } = parsed.data
    // `consent` уже проверен Zod (z.literal(true) отклонит запрос без галочки).
    // Факт согласия сохраняется ниже в raw_user_meta_data → triггер handle_new_user
    // запишет terms_accepted_at и terms_accepted_version в profiles.

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

    // generateLink создаёт юзера (неподтверждённого) и возвращает confirmation link,
    // НЕ инициируя Supabase-отправку email. Наш Resend отправляет единственное письмо
    // на языке профиля. См. lib/email.ts.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin
    const language: EmailLocale = preferredLanguage ?? 'de'
    const trimmedName = name?.trim()
    const userMeta: Record<string, string> = {
      preferred_language: language,
      terms_accepted_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
    }
    if (trimmedName) userMeta.name = trimmedName
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo: `${baseUrl}/auth/callback`,
        data: userMeta,
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      const msg = linkError?.message || 'Registrierung fehlgeschlagen'
      const status = /already registered|already exists|already been registered/i.test(msg)
        ? 409
        : 400
      const clientMsg = status === 409 ? 'Diese E-Mail ist bereits registriert.' : msg
      return registerJson({ error: clientMsg }, { status })
    }

    try {
      await sendConfirmationEmail(email, linkData.properties.action_link, language)
    } catch (e) {
      // Юзер уже создан в auth.users. Письмо не ушло — не блокируем UX, но логируем громко.
      // Пользователь увидит success-экран и сможет запросить новое письмо через /login.
      console.error(
        '[register] sendConfirmationEmail failed:',
        e instanceof Error ? e.message : e,
      )
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
