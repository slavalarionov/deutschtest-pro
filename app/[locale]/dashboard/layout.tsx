import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/DashboardShell'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?next=/dashboard')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('modules_balance')
    .eq('id', user.id)
    .single()

  const modulesBalance = profile?.modules_balance ?? 0

  return (
    <DashboardShell email={user.email ?? ''} modulesBalance={modulesBalance}>
      {children}
    </DashboardShell>
  )
}
