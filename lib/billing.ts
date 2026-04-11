import { createServerClient } from '@/lib/supabase-server'

export async function getModulesBalance(userId: string): Promise<number> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('modules_balance')
    .eq('id', userId)
    .single()

  if (error || data == null) return 0
  return typeof data.modules_balance === 'number' ? data.modules_balance : 0
}

export async function deductModuleFromBalance(userId: string, count: number = 1): Promise<void> {
  if (count <= 0) return

  const supabase = createServerClient()
  const balance = await getModulesBalance(userId)
  if (balance < count) {
    throw new Error('Insufficient modules balance')
  }

  const { error } = await supabase
    .from('profiles')
    .update({ modules_balance: balance - count })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to update balance: ${error.message}`)
  }
}

/**
 * After a module is finished: charge one credit if the session is not a free test
 * and the user has a positive prepaid balance (legacy paid rows without balance skip).
 */
export async function deductModuleBalanceIfNeeded(userId: string, sessionId: string): Promise<void> {
  const supabase = createServerClient()

  const { data: attempt, error: aErr } = await supabase
    .from('user_attempts')
    .select('is_free_test')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (aErr || !attempt) return
  if (attempt.is_free_test === true) return

  const bal = await getModulesBalance(userId)
  if (bal <= 0) return

  await deductModuleFromBalance(userId, 1)
}
