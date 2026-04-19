'use client'

import { useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { createClient } from '@/lib/supabase/client'
import { Link } from '@/i18n/routing'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthDivider } from '@/components/auth/AuthDivider'
import { AuthOAuthButton } from '@/components/auth/AuthOAuthButton'
import { AuthInput } from '@/components/auth/AuthInput'

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
        body: JSON.stringify({
          email,
          password,
          turnstileToken,
          preferredLanguage: locale,
        }),
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
      <AuthLayout
        eyebrow={t('successTitle').toUpperCase()}
        titleStrong={t('successTitle')}
      >
        <div className="space-y-4 text-sm text-ink-soft">
          <p>
            {t.rich('successBody', {
              email,
              strong: (chunks) => (
                <span className="font-medium text-ink">{chunks}</span>
              ),
            })}
          </p>
          <p>
            {t.rich('successBonus', {
              strong: (chunks) => (
                <span className="font-medium text-ink">{chunks}</span>
              ),
            })}
          </p>
          <Link
            href="/login"
            className="mt-2 inline-flex items-center gap-2 rounded-rad-pill bg-ink px-6 py-3.5 text-sm font-medium text-card transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
          >
            {t('successLoginLink')}
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
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      eyebrow={t('title').toUpperCase()}
      titleStrong={t('subtitle')}
      footer={
        <p className="text-sm text-ink-soft">
          {t('hasAccount')}{' '}
          <Link
            href="/login"
            className="font-medium text-ink underline-offset-4 hover:underline"
          >
            {t('loginLink')}
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

      <form onSubmit={handleEmailRegister} className="space-y-4">
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
          minLength={8}
          autoComplete="new-password"
          icon="lock"
          hint={t('passwordHint')}
        />

        {turnstileSiteKey && (
          <div className="flex justify-center">
            <Turnstile
              ref={turnstileRef}
              siteKey={turnstileSiteKey}
              onSuccess={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
              onError={() => setTurnstileToken(null)}
              options={{
                theme: 'light',
                size: 'flexible',
                appearance: 'interaction-only',
              }}
            />
          </div>
        )}

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
