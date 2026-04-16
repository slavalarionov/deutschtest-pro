import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from './lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

  // Защита роутов /admin/*: только залогиненные пользователи.
  // Проверка is_admin делается дополнительно в server components через requireAdminPage().
  // Здесь мы НЕ ходим в БД — middleware должен оставаться быстрым.
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
