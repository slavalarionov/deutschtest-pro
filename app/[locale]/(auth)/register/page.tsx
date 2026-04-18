'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useLocale, useTranslations } from 'next-intl'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { createClient } from '@/lib/supabase/client'
import { Link } from '@/i18n/routing'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'

export default function RegisterPage() {
  const t = useTranslations('auth.register')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const turnstileRef = useRef<TurnstileInstance | null>(null)

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  async function handleGoogleLogin() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) setError(error.message)
  }

  async function handleEmailRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password.length < 8) {
      setError(t('errors.passwordTooShort'))
      setLoading(false)
      return
    }

    if (turnstileSiteKey && !turnstileToken) {
      setError(t('errors.captchaRequired'))
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, turnstileToken, preferredLanguage: locale }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || t('errors.registrationFailed'))
        turnstileRef.current?.reset()
        setTurnstileToken(null)
        setLoading(false)
        return
      }

      setSuccess(true)
    } catch {
      setError(t('errors.network'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md rounded-2xl bg-brand-white p-8 text-center shadow-card"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-gold/10">
            <svg
              className="h-8 w-8 text-brand-gold"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-brand-text">{t('successTitle')}</h2>
          <p className="mt-3 text-sm text-brand-muted">
            {t.rich('successBody', {
              email,
              strong: (chunks) => (
                <span className="font-medium text-brand-text">{chunks}</span>
              ),
            })}
          </p>
          <p className="mt-3 text-sm text-brand-muted">
            {t.rich('successBonus', {
              strong: (chunks) => <span className="font-medium">{chunks}</span>,
            })}
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block text-sm font-medium text-brand-gold hover:text-brand-gold-dark"
          >
            {t('successLoginLink')}
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg px-4">
      <div className="absolute right-4 top-4 sm:right-8 sm:top-6">
        <LanguageSwitcher />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-2xl bg-brand-white p-8 shadow-card"
      >
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-text">{t('title')}</h1>
          <p className="mt-2 text-sm text-brand-muted">{t('subtitle')}</p>
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

        <form onSubmit={handleEmailRegister} className="space-y-4">
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
              autoComplete="email"
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
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-brand-border bg-brand-bg px-4 py-2.5 text-sm text-brand-text placeholder:text-brand-muted/50 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold"
              placeholder={t('passwordPlaceholder')}
            />
            <p className="mt-2 text-xs text-brand-muted">{t('passwordHint')}</p>
          </div>

          {turnstileSiteKey && (
            <div className="flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={turnstileSiteKey}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
                options={{ theme: 'light', size: 'flexible' }}
              />
            </div>
          )}

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
          {t('hasAccount')}{' '}
          <Link
            href="/login"
            className="font-medium text-brand-gold hover:text-brand-gold-dark"
          >
            {t('loginLink')}
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
