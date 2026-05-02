import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/require-admin'
import { AdminNavLink } from './admin-nav-link'
import type { AdminIconName } from '@/components/admin/AdminIcon'

const NAV_ITEMS: ReadonlyArray<{ href: string; label: string; icon: AdminIconName }> = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/users', label: 'Пользователи', icon: 'users' },
  { href: '/admin/referral-sources', label: 'Источники', icon: 'referral-sources' },
  { href: '/admin/prompts', label: 'Промпты', icon: 'prompts' },
  { href: '/admin/topics', label: 'Темы', icon: 'topics' },
  { href: '/admin/learning-resources', label: 'Учебные ресурсы', icon: 'learning-resources' },
  { href: '/admin/promo', label: 'Промо', icon: 'promo' },
  { href: '/admin/economy', label: 'Экономика', icon: 'economy' },
  { href: '/admin/fixed-costs', label: 'Постоянные расходы', icon: 'fixed-costs' },
  { href: '/admin/feedback', label: 'Фидбэк', icon: 'feedback' },
] as const

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await requireAdminPage('/admin')

  return (
    <div className="flex min-h-screen bg-page">
      <aside className="flex w-[220px] flex-col border-r border-line bg-page">
        <div className="p-5">
          <Link
            href="/admin"
            className="inline-flex items-baseline gap-2"
            aria-label="DeutschTest.pro Admin"
          >
            <span className="font-display text-lg font-medium tracking-tight text-ink">
              deutschtest<span className="text-muted">.pro</span>
            </span>
          </Link>
          <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-accent-ink">
            Admin
          </div>
          <p className="mt-2 truncate text-xs text-muted">{admin.email}</p>
        </div>

        <nav className="mt-6 flex-1 space-y-0.5 px-5">
          {NAV_ITEMS.map((item) => (
            <AdminNavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}
        </nav>

        <div className="border-t border-line px-5 py-4">
          <Link
            href="/"
            className="block text-xs text-muted transition-colors hover:text-ink"
          >
            Вернуться на сайт
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  )
}
