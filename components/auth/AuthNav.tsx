'use client'

import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/routing'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'

interface AuthNavProps {
  userEmail: string | null
}

export function AuthNav({ userEmail }: AuthNavProps) {
  const router = useRouter()
  const t = useTranslations('nav')

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
  }

  if (userEmail) {
    return (
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted sm:inline">
          {t.rich('greeting', {
            email: userEmail,
            name: (chunks) => (
              <span className="font-medium text-ink">{chunks}</span>
            ),
          })}
        </span>
        <Link
          href="/dashboard"
          className="rounded-rad-pill bg-ink px-4 py-2 text-sm font-medium text-page transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
        >
          {t('dashboard')}
        </Link>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="rounded-rad-pill border border-line bg-card px-4 py-2 text-sm text-ink-soft transition-colors hover:bg-surface hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
        >
          {t('logout')}
        </motion.button>
        <LanguageSwitcher isLoggedIn />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/login"
        className="text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
      >
        {t('login')}
      </Link>
      <Link
        href="/register"
        className="rounded-rad-pill bg-ink px-4 py-2 text-sm font-medium text-page transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
      >
        {t('register')}
      </Link>
      <LanguageSwitcher />
    </div>
  )
}
