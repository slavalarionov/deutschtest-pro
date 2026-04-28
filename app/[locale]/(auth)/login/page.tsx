'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Link } from '@/i18n/routing'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthDivider } from '@/components/auth/AuthDivider'
import { AuthOAuthButton } from '@/components/auth/AuthOAuthButton'
import { AuthInput } from '@/components/auth/AuthInput'
import { Footer } from '@/components/landing/Footer'

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
      : '/dashboard'

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

    router.replace(safeNext)
    router.refresh()
  }

  return (
    <AuthLayout
      eyebrow={t('eyebrow')}
      titleStrong={t('welcome')}
      footer={
        <p className="text-sm text-ink-soft">
          {t('noAccount')}{' '}
          <Link
            href="/register"
            className="font-medium text-ink underline-offset-4 hover:underline"
          >
            {t('registerLink')}
          </Link>
        </p>
      }
    >
      <AuthOAuthButton
        onClick={handleGoogleLogin}
        disabled={loading}
        label={t('googleButton')}
      />

      <AuthDivider label={tCommon('or')} />

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <AuthInput
          id="email"
          type="email"
          label={t('emailLabel')}
          placeholder={t('emailPlaceholder')}
          value={email}
          onChange={setEmail}
          required
          autoComplete="email"
          icon="mail"
        />

        <AuthInput
          id="password"
          type="password"
          label={t('passwordLabel')}
          placeholder={t('passwordPlaceholder')}
          value={password}
          onChange={setPassword}
          required
          autoComplete="current-password"
          icon="lock"
        />

        {error && (
          <p className="rounded-rad-sm border border-error/30 bg-error-soft p-3 text-sm text-error">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-rad-pill bg-ink px-6 py-3.5 text-sm font-medium text-card transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
        >
          {loading ? (
            <>
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-rad-pill border-2 border-card border-t-transparent"
              />
              {t('submitting')}
            </>
          ) : (
            <>
              {t('submitButton')}
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M5 10h10M11 6l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <>
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
      <Footer />
    </>
  )
}

function LoginFallback() {
  const t = useTranslations('auth.login')
  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="text-sm text-muted">{t('loadingFallback')}</div>
    </div>
  )
}
