'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'

const NAV_ITEMS = [
  { href: '/dashboard', navKey: 'dashboard', icon: '🏠' },
  { href: '/dashboard/history', navKey: 'history', icon: '📚' },
  { href: '/dashboard/progress', navKey: 'progress', icon: '📈' },
  { href: '/dashboard/recommendations', navKey: 'recommendations', icon: '💡' },
  { href: '/dashboard/payments', navKey: 'payments', icon: '💳' },
  { href: '/dashboard/settings', navKey: 'settings', icon: '⚙️' },
] as const

interface DashboardShellProps {
  email: string
  children: React.ReactNode
}

export function DashboardShell({ email, children }: DashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('dashboard.shell')
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  const navLinks = (
    <nav className="flex-1 space-y-1 p-4">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-md px-4 py-2.5 text-sm transition-colors ${
            isActive(item.href)
              ? 'bg-brand-gold/10 font-semibold text-brand-gold-dark'
              : 'text-brand-text hover:bg-brand-border/60'
          }`}
        >
          <span className="text-base">{item.icon}</span>
          <span>{t(`nav.${item.navKey}`)}</span>
        </Link>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-brand-bg">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-brand-border bg-brand-surface px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="text-base font-bold text-brand-text">
          DeutschTest<span className="text-brand-gold">.pro</span>
        </Link>
        <button
          type="button"
          aria-label={t('openMenu')}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-brand-border bg-brand-white px-3 py-1.5 text-sm"
        >
          {open ? '✕' : '☰'}
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-brand-border bg-brand-surface transition-transform lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="border-b border-brand-border p-6">
          <Link href="/dashboard" className="block">
            <h1 className="text-lg font-bold text-brand-text">
              DeutschTest<span className="text-brand-gold">.pro</span>
            </h1>
          </Link>
          <p className="mt-1 truncate text-xs text-brand-muted">{email}</p>
        </div>

        {navLinks}

        <div className="space-y-3 border-t border-brand-border p-4">
          <LanguageSwitcher isLoggedIn variant="compact" />
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-brand-muted hover:text-brand-text"
          >
            {t('backHome')}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-brand-muted hover:text-brand-text"
          >
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Overlay on mobile when sidebar open */}
      {open && (
        <button
          type="button"
          aria-label={t('closeMenu')}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
        />
      )}

      <main className="flex-1 overflow-x-hidden px-4 pb-12 pt-20 sm:px-8 lg:pt-8">
        {children}
      </main>
    </div>
  )
}
