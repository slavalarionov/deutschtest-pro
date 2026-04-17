/**
 * Хард-делит пользователя с аудит-снимком.
 *
 * Шаги:
 *   1. Собирает снимок профиля (email, display_name, баланс, флаги, кол-во попыток).
 *   2. Пишет строку в deleted_users_audit.
 *   3. Зовёт auth.admin.deleteUser — каскадом удалит profiles и всё, что FK на auth.users.
 *
 * Safety-rails (no-self-delete, no-admin-delete) вызывающий код должен проверить до
 * этого хелпера — сюда попадают только ID, которые уже прошли проверки.
 *
 * Возвращает null при успехе, строку-reason при логической ошибке (напр. юзер не найден).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

interface ProfileSnapshot {
  id: string
  email: string
  display_name: string | null
  modules_balance: number
  is_admin: boolean
  is_unlimited: boolean | null
}

export async function deleteUserWithAudit(
  supabase: SupabaseClient,
  userId: string,
  deletedBy: string,
  note?: string
): Promise<string | null> {
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, display_name, modules_balance, is_admin, is_unlimited')
    .eq('id', userId)
    .maybeSingle()

  if (profileErr) return `profile lookup failed: ${profileErr.message}`
  if (!profile) return 'user not found'

  const snap = profile as ProfileSnapshot

  const { count: attemptsCount } = await supabase
    .from('user_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)

  const { error: auditErr } = await supabase.from('deleted_users_audit').insert({
    deleted_by: deletedBy,
    user_id: snap.id,
    email: snap.email,
    display_name: snap.display_name,
    modules_balance_at_delete: snap.modules_balance,
    attempts_count_at_delete: attemptsCount ?? 0,
    was_admin: snap.is_admin,
    was_unlimited: snap.is_unlimited ?? false,
    note: note ?? null,
  })
  if (auditErr) return `audit insert failed: ${auditErr.message}`

  const { error: deleteErr } = await supabase.auth.admin.deleteUser(userId)
  if (deleteErr) return `auth delete failed: ${deleteErr.message}`

  return null
}
