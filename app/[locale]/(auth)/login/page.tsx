'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Link } from '@/i18n/routing'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('auth.login')
  const tCommon = useTranslations('common')

  // Безопасное чтение next: только относительные пути, начинающиеся с /
  // Это защита от open redirect — нельзя редиректить на внешние URL.
  const rawNext = searchParams.get('next')
  const safeNext =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGoogleLogin() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    })
    if (error) setError(error.message)
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(safeNext)
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-2xl bg-brand-white p-8 shadow-card"
      >
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-text">{t('title')}</h1>
          <p className="mt-2 text-sm text-brand-muted">{t('welcome')}</p>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleGoogleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-brand-border bg-brand-bg px-4 py-3 text-sm font-medium text-brand-text shadow-soft transition hover:border-brand-gold/40"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {t('googleButton')}
        </motion.button>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-brand-border" />
          <span className="text-xs font-medium text-brand-muted">{tCommon('or')}</span>
          <div className="h-px flex-1 bg-brand-border" />
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-brand-text"
            >
              {t('emailLabel')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-brand-border bg-brand-bg px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/50 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
              placeholder={t('emailPlaceholder')}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-brand-text"
            >
              {t('passwordLabel')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-brand-border bg-brand-bg px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/50 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
              placeholder={t('passwordPlaceholder')}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-brand-red/5 px-3 py-2 text-sm text-brand-red">
              {error}
            </p>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-gold px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-gold-dark disabled:opacity-70"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t('submitting')}
              </span>
            ) : (
              t('submitButton')
            )}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-muted">
          {t('noAccount')}{' '}
          <Link
            href="/register"
            className="font-medium text-brand-gold hover:text-brand-gold-dark"
          >
            {t('registerLink')}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7]">
      <div className="text-sm text-[#6B6560]">Wird geladen…</div>
    </div>
  )
}
