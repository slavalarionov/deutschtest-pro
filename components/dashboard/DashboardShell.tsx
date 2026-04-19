'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname, useRouter } from '@/i18n/routing'
import { createClient } from '@/lib/supabase/client'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'

type IconName =
  | 'home'
  | 'history'
  | 'chart'
  | 'lightbulb'
  | 'card'
  | 'settings'
  | 'bolt'
  | 'menu'
  | 'close'

/**
 * Minimal stroke-only icon set (1.5px stroke, round caps/joins, 24×24).
 * Mirrors the `Icon` component from the Phase 3 prototype. Additions go here.
 */
function SidebarIcon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <path d="M4 10.5 12 4l8 6.5" />
        <path d="M6 10v9h12v-9" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v4h4" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15l4-5 3 3 5-7" />
      </>
    ),
    lightbulb: (
      <>
        <path d="M9 18h6" />
        <path d="M10 21h4" />
        <path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.3 1 2.5h6c0-1.2.2-1.7 1-2.5A6 6 0 0 0 12 3Z" />
      </>
    ),
    card: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </>
    ),
    bolt: (
      <>
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
    close: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
      </>
    ),
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name]}
    </svg>
  )
}

type NavItem = {
  href: string
  navKey: 'dashboard' | 'history' | 'progress' | 'recommendations' | 'payments' | 'settings'
  icon: IconName
}

const MAIN_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', navKey: 'dashboard', icon: 'home' },
  { href: '/dashboard/history', navKey: 'history', icon: 'history' },
  { href: '/dashboard/progress', navKey: 'progress', icon: 'chart' },
  { href: '/dashboard/recommendations', navKey: 'recommendations', icon: 'lightbulb' },
] as const

const ACCOUNT_ITEMS: readonly NavItem[] = [
  { href: '/dashboard/payments', navKey: 'payments', icon: 'card' },
  { href: '/dashboard/settings', navKey: 'settings', icon: 'settings' },
] as const

// Visual reference only — 20 matches the Standard package size so the pipe
// renders half-full at the typical restock point. Pure UI, no business logic.
const CREDITS_PIPE_DENOMINATOR = 20

interface DashboardShellProps {
  email: string
  modulesBalance: number
  children: React.ReactNode
}

export function DashboardShell({ email, modulesBalance, children }: DashboardShellProps) {
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

  const pipeWidth = Math.min(Math.max(modulesBalance, 0) / CREDITS_PIPE_DENOMINATOR, 1) * 100

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setOpen(false)}
        className={`flex items-center gap-3 rounded-rad-pill px-3 py-2 text-sm transition-colors ${
          active
            ? 'bg-ink text-page'
            : 'text-ink-soft hover:bg-surface hover:text-ink'
        }`}
      >
        <SidebarIcon name={item.icon} className="h-[15px] w-[15px] shrink-0" />
        <span>{t(`nav.${item.navKey}`)}</span>
      </Link>
    )
  }

  const sidebarContent = (
    <div className="flex h-full flex-col p-5">
      {/* Wordmark + email */}
      <div>
        <Link
          href="/dashboard"
          onClick={() => setOpen(false)}
          className="block font-display text-lg font-medium tracking-tight text-ink"
        >
          DeutschTest<span className="text-muted">.pro</span>
        </Link>
        <p className="mt-1 truncate text-xs text-muted">{email}</p>
      </div>

      {/* Main nav group */}
      <nav className="mt-8 space-y-0.5">
        {MAIN_ITEMS.map(renderNavItem)}
      </nav>

      {/* KONTO divider + account group */}
      <div className="mt-6 flex-1">
        <div className="mb-2 px-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          {t('konto')}
        </div>
        <nav className="space-y-0.5">
          {ACCOUNT_ITEMS.map(renderNavItem)}
        </nav>
      </div>

      {/* CREDITS card */}
      <div className="mt-4 rounded-rad-sm border border-line bg-card p-4">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          <SidebarIcon name="bolt" className="h-[11px] w-[11px]" />
          <span>{t('credits')}</span>
        </div>
        <div className="mt-2 font-display text-2xl tracking-tight text-ink">
          {modulesBalance}
          <span className="ml-1 text-sm text-muted">{t('modulesLeft')}</span>
        </div>
        <div className="mt-2 h-0.5 w-full bg-line">
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${pipeWidth}%` }}
          />
        </div>
      </div>

      {/* Footer: language, back, logout */}
      <div className="mt-4 space-y-3 border-t border-line pt-4">
        <LanguageSwitcher isLoggedIn variant="compact" />
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="block text-xs text-muted transition-colors hover:text-ink"
        >
          {t('backHome')}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs text-muted transition-colors hover:text-ink"
        >
          {t('logout')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-page">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-line bg-page px-4 py-3 lg:hidden">
        <Link
          href="/dashboard"
          className="font-display text-base font-medium tracking-tight text-ink"
        >
          DeutschTest<span className="text-muted">.pro</span>
        </Link>
        <button
          type="button"
          aria-label={open ? t('closeMenu') : t('openMenu')}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-rad-sm border border-line bg-card text-ink transition-colors hover:bg-surface"
        >
          <SidebarIcon name={open ? 'close' : 'menu'} className="h-4 w-4" />
        </button>
      </header>

      {/* Sidebar (off-canvas on mobile, static on desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[260px] border-r border-line bg-page transition-transform lg:static lg:w-[220px] lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          aria-label={t('closeMenu')}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-ink/20 lg:hidden"
        />
      )}

      <main className="flex-1 overflow-x-hidden px-4 pb-12 pt-20 sm:px-8 lg:pt-8">
        {children}
      </main>
    </div>
  )
}
