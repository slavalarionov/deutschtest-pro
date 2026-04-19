import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { AuthNav } from '@/components/auth/AuthNav'
import { PricingSection } from '@/components/landing/PricingSection'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const t = await getTranslations({
    locale: params.locale,
    namespace: 'pricing.standalone.meta',
  })
  return {
    title: t('title'),
    description: t('description'),
    openGraph: { title: t('title'), description: t('description') },
  }
}

export default async function PricingPage(_: {
  params: { locale: string }
}) {
  const tStandalone = await getTranslations('pricing.standalone')
  const tPricing = await getTranslations('pricing')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let modulesBalance = 0
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('modules_balance')
      .eq('id', user.id)
      .single()
    modulesBalance = profile?.modules_balance ?? 0
  }

  const showAuthBanner = !!user && modulesBalance > 0

  return (
    <main className="min-h-screen bg-page">
      <header className="absolute right-4 top-4 z-50 sm:right-8 sm:top-6">
        <AuthNav userEmail={user?.email ?? null} />
      </header>

      {/* Editorial header */}
      <section className="bg-page px-4 py-20 text-center sm:py-24 md:py-28">
        <div className="mx-auto max-w-3xl">
          <div className="eyebrow">{tStandalone('eyebrow')}</div>
          <h1 className="mt-4 font-display text-5xl leading-none tracking-tighter text-ink md:text-7xl">
            {tStandalone('title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink-soft md:text-xl">
            {tStandalone('subtitle')}
          </p>
        </div>
      </section>

      {/* Auth-aware banner (only for logged-in users with remaining credits) */}
      {showAuthBanner && (
        <div className="mx-auto max-w-3xl px-4 pb-4 sm:pb-6">
          <div className="flex flex-col gap-4 rounded-rad border border-accent/30 bg-accent-soft p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <p className="text-sm leading-relaxed text-ink">
              {tStandalone('authBanner.hasCredits', { count: modulesBalance })}
            </p>
            <Link
              href="/dashboard"
              className="inline-flex flex-none items-center gap-2 rounded-rad-pill bg-ink px-5 py-2.5 text-sm font-medium text-card transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
            >
              {tStandalone('authBanner.hasCreditsCta')}
              <ArrowIcon />
            </Link>
          </div>
        </div>
      )}

      {/* Pricing grid (reused as-is from landing) */}
      <PricingSection />

      {/* Footnote (mono caption with lock icon + three points) */}
      <div className="mx-auto max-w-3xl px-4 pb-16 sm:pb-20">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-xs uppercase tracking-wider text-muted">
          <LockIcon />
          <span>{tPricing('footnote.secure')}</span>
          <span aria-hidden="true">·</span>
          <span>{tPricing('footnote.noSubs')}</span>
          <span aria-hidden="true">·</span>
          <span>{tPricing('footnote.refund')}</span>
        </div>
      </div>
    </main>
  )
}

/* ---------- Inline icons ---------- */

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 10h10M11 6l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 9V6.5a4 4 0 0 1 8 0V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <rect
        x="4.5"
        y="9"
        width="11"
        height="8.5"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}
