/**
 * Серверный хелпер для проверки админских прав.
 *
 * Используется в:
 * - server components страниц /admin/* (для редиректа неадминов)
 * - API routes /api/admin/* (для возврата 403 неадминам)
 *
 * ВАЖНО: Это второй уровень защиты. Первый — middleware, который редиректит
 * неавторизованных пользователей с /admin/* на /login. Этот хелпер дополнительно
 * проверяет, что авторизованный пользователь является админом.
 *
 * Дублирование намеренное: middleware можно случайно сломать обновлением Next.js
 * или конфигом, серверная проверка страхует.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface AdminUser {
  id: string
  email: string
  isAdmin: true
}

/**
 * Используется в server components страниц /admin/*.
 * Если пользователь не залогинен — редирект на /login?next=...
 * Если залогинен, но не админ — редирект на главную (без подсказок, что админка существует).
 * Возвращает данные юзера, если всё ок.
 */
export async function requireAdminPage(currentPath: string): Promise<AdminUser> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // ВРЕМЕННЫЙ DEBUG
  console.error('[DEBUG requireAdminPage] path:', currentPath)
  console.error('[DEBUG requireAdminPage] user:', user ? { id: user.id, email: user.email } : null)

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`)
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, is_admin')
    .eq('id', user.id)
    .single()

  // ВРЕМЕННЫЙ DEBUG
  console.error('[DEBUG requireAdminPage] profile:', profile)
  console.error('[DEBUG requireAdminPage] error:', error)

  if (error || !profile || !profile.is_admin) {
    redirect('/')
  }

  return {
    id: profile.id,
    email: profile.email,
    isAdmin: true,
  }
}

/**
 * Используется в API routes /api/admin/*.
 * Бросает Response с 401/403 — обработать в каждом route через try/catch
 * или return response непосредственно.
 *
 * Пример использования в API route:
 *   export async function POST(req: NextRequest) {
 *     const adminCheck = await requireAdminApi()
 *     if (adminCheck instanceof Response) return adminCheck
 *     const admin = adminCheck
 *     // ... основная логика
 *   }
 */
export async function requireAdminApi(): Promise<AdminUser | Response> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, is_admin')
    .eq('id', user.id)
    .single()

  if (error || !profile || !profile.is_admin) {
    return new Response(
      JSON.stringify({ error: 'Forbidden' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return {
    id: profile.id,
    email: profile.email,
    isAdmin: true,
  }
}
