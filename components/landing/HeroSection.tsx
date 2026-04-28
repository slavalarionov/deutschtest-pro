'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { HeroQuizDesktop } from './hero-quiz/HeroQuizDesktop'
import { HeroQuizMobile } from './hero-quiz/HeroQuizMobile'

interface HeroSectionProps {
  /**
   * The landing is public for everyone, including authenticated users.
   * When `true`, the primary CTA switches from "register" to "dashboard"
   * and the secondary "already registered?" link is hidden.
   */
  isLoggedIn: boolean
}

/**
 * Landing Hero — editorial layout (Phase 3 Redesign).
 *
 * Big display typography on the left, ß grapheme + two living quiz cards
 * on the right (KI-Feedback hint above, task/result below). The grapheme
 * stays visible between the cards — the editorial composition from
 * `docs/Redesign.html` (lines 311–409) is preserved; the cards are now
 * interactive instead of static previews.
 */
export function HeroSection({ isLoggedIn }: HeroSectionProps) {
  const t = useTranslations('landing.hero')

  return (
    <section
      className="relative overflow-hidden bg-page"
      aria-labelledby="landing-hero-title"
    >
      {/* Hero grid */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-end gap-10 px-4 pb-10 pt-24 sm:px-6 sm:pt-28 lg:grid-cols-12 lg:gap-8 lg:px-10 lg:pt-20">
        {/* Left: copy */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="lg:col-span-7"
        >
          {/* Eyebrow chip */}
          <span
            className="mb-6 inline-flex items-center gap-2 rounded-rad-pill border border-line bg-card px-3 py-1.5 text-xs font-medium sm:mb-8"
            style={{ color: 'var(--muted)' }}
          >
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-rad-pill bg-accent"
            />
            <span>{t('badge')}</span>
          </span>

          {/* Display headline — three parts, middle italic in accent */}
          <h1
            id="landing-hero-title"
            className="font-display text-balance text-[44px] font-normal leading-[1.02] tracking-tighter text-ink sm:text-[64px] lg:text-[96px] lg:leading-[0.95]"
          >
            <span className="text-muted">{t('titlePart1')}</span>
            <br />
            <span className="italic" style={{ fontWeight: 500 }}>
              {t('titleHighlight')}
            </span>
            <span className="text-muted"> </span>
            <span>{t('titlePart2')}</span>
          </h1>

          {/* Lead */}
          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:mt-8 sm:text-lg">
            {t('subtitle')}
          </p>

          {/* Primary CTA */}
          <div className="mt-8 flex flex-col items-start gap-3 sm:mt-10">
            <Link
              href={isLoggedIn ? '/dashboard' : '/register'}
              className="inline-flex items-center gap-2 rounded-rad-pill bg-ink px-6 py-3.5 text-sm font-medium text-card transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
            >
              {isLoggedIn ? t('ctaDashboard') : t('ctaRegister')}
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

            {!isLoggedIn && (
              <Link
                href="/login"
                className="text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
              >
                {t('alreadyRegistered')}
              </Link>
            )}
          </div>

          {/* Mobile-only quiz: between CTA and stats-row.
              Desktop instance lives in the right column below. */}
          <div className="mt-10 lg:hidden">
            <HeroQuizMobile />
          </div>

          {/* Stats row */}
          <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 text-sm text-muted sm:mt-14 sm:gap-10">
            <div>
              <span className="block font-display text-2xl text-ink">3</span>
              {t('stats.levels')}
            </div>
            <div className="hidden h-8 w-px bg-line sm:block" />
            <div>
              <span className="block font-display text-2xl text-ink">4</span>
              {t('stats.modules')}
            </div>
            <div className="hidden h-8 w-px bg-line sm:block" />
            <div>
              <span className="block font-display text-2xl text-ink">
                {t('stats.aiLabel')}
              </span>
              {t('stats.ai')}
            </div>
          </div>
        </motion.div>

        {/* Right: ß grapheme + interactive floating quiz cards (desktop only) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="hidden lg:col-span-5 lg:block"
        >
          <HeroQuizDesktop />
        </motion.div>
      </div>

      {/* Scrolling letters strip */}
      <div className="overflow-hidden border-y border-line-soft py-4 sm:py-6">
        <div
          className="flex animate-letter-drift gap-10 whitespace-nowrap font-display sm:gap-14"
          style={{ fontSize: 'clamp(40px, 8vw, 72px)', lineHeight: 1 }}
        >
          {Array.from({ length: 2 }).map((_, k) => (
            <div key={k} className="flex gap-10 sm:gap-14">
              {['ä', 'ö', 'ü', 'ß', 'ei', 'ch', 'sch', 'ng', 'eu', 'au', 'ie'].map(
                (l, i) => (
                  <span
                    key={i}
                    style={{
                      color: i % 3 === 0 ? 'var(--ink)' : 'var(--line)',
                    }}
                  >
                    {l}
                  </span>
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
