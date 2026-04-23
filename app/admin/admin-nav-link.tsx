'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminIcon, type AdminIconName } from '@/components/admin/AdminIcon'

/**
 * Пункт сайдбара админки с авто-подсветкой активной секции.
 * Активным считается точное совпадение (href === path) или вложенные пути (/admin/users/[id]).
 * Для корневого /admin — только точное совпадение (иначе бы вообще всё было активным).
 */
export function AdminNavLink({
  href,
  icon,
  label,
}: {
  href: string
  icon: AdminIconName
  label: string
}) {
  const pathname = usePathname() ?? ''
  const isActive = href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-rad-pill px-3 py-2 text-sm transition-colors ${
        isActive
          ? 'bg-ink text-page'
          : 'text-ink-soft hover:bg-surface hover:text-ink'
      }`}
    >
      <AdminIcon name={icon} className="h-[15px] w-[15px] shrink-0" />
      <span>{label}</span>
    </Link>
  )
}
