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
        <span className="hidden text-sm text-brand-muted sm:inline">
          {t.rich('greeting', {
            email: userEmail,
            name: (chunks) => (
              <span className="font-medium text-brand-text">{chunks}</span>
            ),
          })}
        </span>
        <Link
          href="/dashboard"
          className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-gold-dark"
        >
          {t('dashboard')}
        </Link>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleLogout}
          className="rounded-lg border border-brand-border bg-brand-white px-4 py-2 text-sm font-medium text-brand-text shadow-soft transition hover:border-brand-gold/40"
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
        className="rounded-lg border border-brand-border bg-brand-white px-4 py-2 text-sm font-medium text-brand-text shadow-soft transition hover:border-brand-gold/40"
      >
        {t('login')}
      </Link>
      <Link
        href="/register"
        className="rounded-lg bg-brand-gold px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-gold-dark"
      >
        {t('register')}
      </Link>
      <LanguageSwitcher />
    </div>
  )
}
