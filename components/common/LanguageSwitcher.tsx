'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'
import { motion, AnimatePresence } from 'framer-motion'

type SupportedLocale = 'de' | 'ru' | 'en' | 'tr'

const OPTIONS: { code: SupportedLocale; label: string }[] = [
  { code: 'de', label: 'Deutsch' },
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
]

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function setLocaleCookie(locale: SupportedLocale) {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `NEXT_LOCALE=${locale}; Path=/; Max-Age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}

interface LanguageSwitcherProps {
  isLoggedIn?: boolean
  variant?: 'default' | 'compact'
}

export function LanguageSwitcher({ isLoggedIn = false, variant = 'default' }: LanguageSwitcherProps) {
  const currentLocale = (useLocale() as SupportedLocale) || 'de'
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  async function selectLocale(locale: SupportedLocale) {
    setOpen(false)
    if (locale === currentLocale) return

    setLocaleCookie(locale)

    if (isLoggedIn) {
      fetch('/api/user/preferred-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: locale }),
      }).catch(() => {
        // silent: cookie + URL уже сменят локаль, БД догонит при следующем клике
      })
    }

    startTransition(() => {
      router.replace(pathname, { locale })
      router.refresh()
    })
  }

  const currentLabel = OPTIONS.find((o) => o.code === currentLocale)?.label ?? 'Deutsch'
  const isCompact = variant === 'compact'

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={
          isCompact
            ? 'inline-flex items-center gap-1 rounded-rad-sm border border-line bg-card px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface'
            : 'inline-flex items-center gap-1.5 rounded-rad-sm border border-line bg-card px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface'
        }
      >
        <span>{currentLabel}</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.06l3.71-3.83a.75.75 0 1 1 1.08 1.04l-4.25 4.39a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label="Language"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-rad-sm border border-line bg-card shadow-lift"
          >
            {OPTIONS.map((opt) => {
              const active = opt.code === currentLocale
              return (
                <li key={opt.code} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => selectLocale(opt.code)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? 'bg-ink font-medium text-page'
                        : 'text-ink-soft hover:bg-surface hover:text-ink'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {active && (
                      <span aria-hidden className="text-page">
                        ✓
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
