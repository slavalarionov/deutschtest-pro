import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@/lib/supabase-server'
import { SettingsView } from '@/components/dashboard/SettingsView'

export const dynamic = 'force-dynamic'

export default async function DashboardSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await createServerClient()
    .from('profiles')
    .select('display_name, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const initialName =
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    ''

  // Email-password if at least one identity uses the "email" provider.
  const identities = user.identities ?? []
  const hasEmailProvider = identities.some((i) => i.provider === 'email')

  return (
    <SettingsView
      email={user.email ?? ''}
      initialName={initialName}
      canChangePassword={hasEmailProvider}
      memberSince={user.created_at}
    />
  )
}
