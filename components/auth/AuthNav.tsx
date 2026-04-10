'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface AuthNavProps {
  userEmail: string | null
}

export function AuthNav({ userEmail }: AuthNavProps) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  if (userEmail) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-brand-muted">
          Hallo, <span className="font-medium text-brand-text">{userEmail}</span>!
        </span>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="rounded-lg border border-brand-border bg-brand-white px-4 py-2 text-sm font-medium text-brand-text shadow-soft transition hover:border-brand-gold/40"
        >
          Abmelden
        </motion.button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="rounded-lg border border-brand-border bg-brand-white px-4 py-2 text-sm font-medium text-brand-text shadow-soft transition hover:border-brand-gold/40"
      >
        Anmelden
      </Link>
      <Link
        href="/register"
        className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-gold-dark"
      >
        Registrieren
      </Link>
    </div>
  )
}
