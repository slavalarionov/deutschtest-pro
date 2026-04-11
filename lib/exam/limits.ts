import { createServerClient } from '@/lib/supabase-server'

export async function checkFreeTestAvailable(userId: string): Promise<boolean> {
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('user_attempts')
    .select('id, is_free_test, payment_status')
    .eq('user_id', userId)
    .eq('is_free_test', true)

  console.log('[limits] checkFreeTestAvailable for user:', userId)
  console.log('[limits] query result — data:', JSON.stringify(data), 'error:', JSON.stringify(error))

  if (error) {
    console.error('[limits] query error:', error)
    return true
  }

  const available = !data || data.length === 0
  console.log('[limits] freeTestAvailable:', available)
  return available
}

export interface TestAvailability {
  canTake: boolean
  reason?: 'no_free_tests' | 'no_paid_tests'
  isAdmin?: boolean
  freeTestAvailable: boolean
  paidTestsCount: number
  /** Prepaid module credits (migration 005); 0 if column missing in old DB. */
  modulesBalance: number
}

export async function checkUserCanTakeTest(userId: string, email?: string): Promise<TestAvailability> {
  const supabase = createServerClient()

  let profile: { is_admin?: boolean | null; modules_balance?: number | null } | null = null
  let modulesBalance = 0

  const profRes = await supabase
    .from('profiles')
    .select('is_admin, modules_balance')
    .eq('id', userId)
    .maybeSingle()

  if (profRes.error) {
    console.warn('[limits] profile select (run migration 005 if modules_balance missing):', profRes.error.message)
    const fallback = await supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle()
    profile = fallback.data
  } else {
    profile = profRes.data
    modulesBalance =
      profile && typeof profile.modules_balance === 'number' ? profile.modules_balance : 0
  }

  if (profile?.is_admin === true) {
    return {
      canTake: true,
      isAdmin: true,
      freeTestAvailable: true,
      paidTestsCount: 999,
      modulesBalance: 999_999,
    }
  }

  const freeTestAvailable = await checkFreeTestAvailable(userId)

  const { count: paidCount } = await supabase
    .from('user_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('payment_status', 'paid')

  const paidTestsCount = paidCount ?? 0

  if (freeTestAvailable || paidTestsCount > 0 || modulesBalance > 0) {
    return {
      canTake: true,
      freeTestAvailable,
      paidTestsCount,
      modulesBalance,
    }
  }

  return {
    canTake: false,
    reason: 'no_free_tests',
    freeTestAvailable: false,
    paidTestsCount: 0,
    modulesBalance,
  }
}
