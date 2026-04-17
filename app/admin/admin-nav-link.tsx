'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
  icon: string
  label: string
}) {
  const pathname = usePathname() ?? ''
  const isActive = href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors ${
        isActive
          ? 'bg-[#1A1A1A] text-white hover:bg-[#3A3A3A]'
          : 'text-[#1A1A1A] hover:bg-[#E0DDD6]'
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
