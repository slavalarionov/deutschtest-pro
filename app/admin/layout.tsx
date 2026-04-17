import { requireAdminPage } from '@/lib/admin/require-admin'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/users', label: 'Пользователи', icon: '👥' },
  { href: '/admin/prompts', label: 'Промпты', icon: '✏️' },
  { href: '/admin/topics', label: 'Темы', icon: '🎲' },
  { href: '/admin/promo', label: 'Промокоды', icon: '🎟️' },
  { href: '/admin/economy', label: 'Экономика', icon: '💰' },
  { href: '/admin/feedback', label: 'Фидбэк', icon: '💬' },
] as const

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await requireAdminPage('/admin')

  return (
    <div className="flex min-h-screen bg-[#FAFAF7]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#E0DDD6] bg-[#F2EFE8] flex flex-col">
        <div className="p-6 border-b border-[#E0DDD6]">
          <Link href="/admin" className="block">
            <h1 className="text-xl font-bold text-[#1A1A1A]">
              DeutschTest <span className="text-[#C8A84B]">Admin</span>
            </h1>
          </Link>
          <p className="text-xs text-[#6B6560] mt-1 truncate">{admin.email}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-md text-sm text-[#1A1A1A] hover:bg-[#E0DDD6] transition-colors"
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[#E0DDD6]">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-[#6B6560] hover:text-[#1A1A1A]"
          >
            ← Вернуться на сайт
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
