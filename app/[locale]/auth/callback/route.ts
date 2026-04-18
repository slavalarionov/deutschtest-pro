import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Безопасное чтение next: только относительные пути, начинающиеся с одного /.
  // Защита от open redirect — '//evil.com' интерпретируется браузером как протокол-относительный URL.
  const rawNext = requestUrl.searchParams.get('next')
  const safeNext =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/'

  return NextResponse.redirect(new URL(safeNext, requestUrl.origin))
}
