import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendAdminTelegram } from '@/lib/telegram'

const SUPPORTED_LOCALES = ['de', 'ru', 'en', 'tr'] as const
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

function isSupportedLocale(v: string | undefined): v is SupportedLocale {
  return !!v && (SUPPORTED_LOCALES as readonly string[]).includes(v)
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  const supabase = await createClient()

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)

    // Если у гостя была установлена локаль (через автодетекцию или ручной выбор
    // переключателем), переносим её в профиль — но только при первом входе.
    // Существующего пользователя не перетираем: он мог раньше явно выставить язык.
    const cookieHeader = request.headers.get('cookie') || ''
    const match = cookieHeader.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/)
    const cookieLocale = match?.[1]

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('created_at, preferred_language, target_level')
        .eq('id', user.id)
        .single()
      if (profile) {
        const createdAtMs = new Date(profile.created_at).getTime()
        const isFreshProfile = Date.now() - createdAtMs < 60_000

        if (isFreshProfile) {
          // Уведомление админу о новой регистрации (fire-and-forget,
          // не блокирует редирект юзера на /dashboard).
          const lang =
            (isSupportedLocale(cookieLocale)
              ? cookieLocale
              : profile.preferred_language) ?? '—'
          const targetLevel = profile.target_level ?? '—'
          void sendAdminTelegram(
            [
              '🆕 Новая регистрация',
              user.email ?? user.id,
              `Язык: ${lang} · Цель: ${targetLevel}`,
            ].join('\n'),
          )

          if (
            isSupportedLocale(cookieLocale) &&
            profile.preferred_language !== cookieLocale
          ) {
            await supabase
              .from('profiles')
              .update({ preferred_language: cookieLocale })
              .eq('id', user.id)
          }
        }
      }
    }
  }

  const rawNext = requestUrl.searchParams.get('next')
  const safeNext =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/dashboard'

  const fwdHost = request.headers.get('x-forwarded-host')
  const fwdProto = request.headers.get('x-forwarded-proto') || 'https'
  const baseUrl = fwdHost
    ? `${fwdProto}://${fwdHost}`
    : process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin

  return NextResponse.redirect(new URL(safeNext, baseUrl))
}
