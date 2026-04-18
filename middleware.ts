import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { locales, defaultLocale } from './i18n/request'
import { updateSession } from './lib/supabase/middleware'

const intlMiddleware = createIntlMiddleware({
  locales: locales as unknown as string[],
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: false,
})

const LOCALE_PREFIX_RE = /^\/(de|ru|en|tr)(?=\/|$)/

function stripLocalePrefix(pathname: string): string {
  return pathname.replace(LOCALE_PREFIX_RE, '') || '/'
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Admin and API routes bypass i18n middleware entirely.
  // They still need Supabase session refresh for auth cookies.
  if (pathname.startsWith('/api') || pathname.startsWith('/admin')) {
    const { response, user } = await updateSession(request)

    if (pathname.startsWith('/admin') && !user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return response
  }

  // Run next-intl first — it may rewrite (via x-middleware-rewrite) or redirect.
  const intlResponse = intlMiddleware(request)

  // If next-intl issued a redirect, honor it immediately.
  if (intlResponse.headers.has('location')) {
    return intlResponse
  }

  // Then refresh Supabase session. Its response carries updated auth cookies.
  const { response: supabaseResponse, user } = await updateSession(request)

  // Propagate next-intl routing headers (x-middleware-rewrite / x-middleware-next)
  // onto the Supabase response so Next.js still routes the request under [locale].
  intlResponse.headers.forEach((value, key) => {
    if (key.startsWith('x-middleware-') || key.startsWith('x-next-intl')) {
      supabaseResponse.headers.set(key, value)
    }
  })

  // Dashboard guard — same as before but locale-aware.
  const pathWithoutLocale = stripLocalePrefix(pathname)
  if (pathWithoutLocale.startsWith('/dashboard') && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|txt|xml)$).*)',
  ],
}
