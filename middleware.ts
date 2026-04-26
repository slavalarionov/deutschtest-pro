import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'
import { locales, defaultLocale } from './i18n/request'
import { updateSession, getPreferredLanguage } from './lib/supabase/middleware'

const intlMiddleware = createIntlMiddleware({
  locales: locales as unknown as string[],
  defaultLocale,
  localePrefix: 'as-needed',
  localeDetection: true,
})

const LOCALE_PREFIX_RE = /^\/(de|ru|en|tr)(?=\/|$)/
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365
const SUPPORTED = locales as readonly string[]

function stripLocalePrefix(pathname: string): string {
  return pathname.replace(LOCALE_PREFIX_RE, '') || '/'
}

function hasLocalePrefix(pathname: string): boolean {
  return LOCALE_PREFIX_RE.test(pathname)
}

function getRequestBaseUrl(request: NextRequest): string {
  const fwdHost = request.headers.get('x-forwarded-host')
  const fwdProto = request.headers.get('x-forwarded-proto') || 'https'
  if (fwdHost) {
    return `${fwdProto}://${fwdHost}`
  }
  return process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
}

function buildLocalizedUrl(request: NextRequest, locale: string): URL {
  const u = new URL(request.url)
  const suffix = u.pathname === '/' ? '' : u.pathname
  const base = new URL(getRequestBaseUrl(request))
  u.protocol = base.protocol
  u.host = base.host
  u.pathname = `/${locale}${suffix}`
  return u
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Admin and API bypass i18n entirely. They still need Supabase session refresh.
  if (pathname.startsWith('/api') || pathname.startsWith('/admin')) {
    const { response, user } = await updateSession(request)

    if (pathname.startsWith('/admin') && !user) {
      const loginUrl = new URL('/login', getRequestBaseUrl(request))
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }

    return response
  }

  // Public shareable result pages — canonical URL is /result/{public_id} or
  // /recommendations/{public_id} with no locale prefix. Bypass both Supabase
  // session refresh (page is anonymous) and next-intl rewrite so the URL stays
  // clean for OG bots and pasted links.
  if (pathname.startsWith('/result/') || pathname.startsWith('/recommendations/')) {
    return NextResponse.next()
  }

  // Refresh Supabase session first, so we know the user when deciding on locale redirects.
  const { response: supabaseResponse, user } = await updateSession(request)

  // Authed user on a path without locale prefix → redirect to /{preferred}/... if preference
  // is not the default. If URL already has a locale prefix, we treat that as the user's
  // explicit choice for this navigation and do NOT redirect (may be intentional session choice).
  if (user && !hasLocalePrefix(pathname)) {
    const preferred = await getPreferredLanguage(request, user.id)
    if (preferred && preferred !== defaultLocale && SUPPORTED.includes(preferred)) {
      const redirectUrl = buildLocalizedUrl(request, preferred)
      const res = NextResponse.redirect(redirectUrl)
      // Carry over refreshed Supabase auth cookies so the redirect lands authed.
      supabaseResponse.cookies.getAll().forEach((c) => {
        res.cookies.set(c)
      })
      // Align NEXT_LOCALE cookie with DB preference so subsequent requests skip the lookup.
      res.cookies.set('NEXT_LOCALE', preferred, {
        maxAge: COOKIE_MAX_AGE_SECONDS,
        path: '/',
        sameSite: 'lax',
      })
      return res
    }
  }

  // Run next-intl middleware — for guests it handles Accept-Language detection and cookie,
  // for authed users (past the redirect above) it just confirms routing.
  const intlResponse = intlMiddleware(request)

  if (intlResponse.headers.has('location')) {
    // next-intl issued a redirect (e.g. guest Accept-Language detection). Preserve its
    // response (includes NEXT_LOCALE cookie it sets).
    return intlResponse
  }

  // Propagate next-intl routing headers onto the Supabase response so Next.js still routes
  // the request under [locale].
  intlResponse.headers.forEach((value, key) => {
    if (key.startsWith('x-middleware-') || key.startsWith('x-next-intl')) {
      supabaseResponse.headers.set(key, value)
    }
  })

  // Dashboard guard — same as before but locale-aware.
  const pathWithoutLocale = stripLocalePrefix(pathname)
  if (pathWithoutLocale.startsWith('/dashboard') && !user) {
    const loginUrl = new URL('/login', getRequestBaseUrl(request))
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
