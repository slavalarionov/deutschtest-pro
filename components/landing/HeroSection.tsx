'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'

interface HeroSectionProps {
  /**
   * Guests only see this editorial Hero — logged-in users are redirected to
   * `/dashboard` in `app/[locale]/page.tsx` before render. The prop is kept
   * for API stability and to toggle the small "already registered" link.
   */
  isLoggedIn: boolean
}

/**
 * Landing Hero — editorial layout (Phase 3 Redesign).
 *
 * Port of `LandingHero` from docs/Redesign.html (lines 311–409):
 * big display typography, ß grapheme, two floating preview cards,
 * scrolling letters strip. The test launcher has moved to `/dashboard`;
 * the CTA here is registration-only.
 *
 * Decorative German strings inside the floating cards are intentionally
 * not i18n'd — they are a visual sample of the product, not UI copy.
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
              href="/register"
              className="inline-flex items-center gap-2 rounded-rad-pill bg-ink px-6 py-3.5 text-sm font-medium text-card transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
            >
              {t('ctaRegister')}
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

        {/* Right: ß grapheme + floating cards (desktop only) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="relative hidden h-[520px] lg:col-span-5 lg:block"
          aria-hidden="true"
        >
          {/* ß grapheme */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="font-display leading-none text-ink"
              style={{
                fontSize: 520,
                letterSpacing: '-0.06em',
                fontWeight: 400,
              }}
            >
              ß
            </div>
          </div>

          {/* Unicode label — top-left */}
          <div className="absolute left-0 top-4 flex gap-2 font-mono text-[11px] text-muted">
            <span>U+00DF</span>
            <span>·</span>
            <span>LATIN SMALL LETTER SHARP S</span>
          </div>

          {/* Preview card — LESEN · B1 · Teil 2 */}
          <div className="absolute -right-4 bottom-10 w-60 rounded-rad-sm border border-line bg-card p-4 shadow-lift">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs text-muted">
                LESEN · B1 · Teil 2
              </span>
              <span
                className="rounded-rad-pill px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-ink)',
                }}
              >
                Live
              </span>
            </div>
            <div className="text-sm text-ink">
              {'„Was ist die Hauptaussage des Textes?“'}
            </div>
            <div className="mt-3 space-y-1.5">
              {[
                { text: 'Die Stadt wird umgebaut.', active: false },
                { text: 'Die Menschen sind unzufrieden.', active: false },
                { text: 'Das Projekt wird gefördert.', active: true },
              ].map((opt, i) => (
                <div
                  key={i}
                  className="rounded-rad-sm border px-2.5 py-2 text-xs"
                  style={{
                    borderColor: opt.active ? 'var(--accent)' : 'var(--line)',
                    background: opt.active
                      ? 'var(--accent-soft)'
                      : 'var(--card)',
                    color: opt.active
                      ? 'var(--accent-ink)'
                      : 'var(--ink-soft)',
                  }}
                >
                  <span className="mr-2 font-mono">
                    {String.fromCharCode(97 + i)}
                  </span>
                  {opt.text}
                </div>
              ))}
            </div>
          </div>

          {/* Preview card — KI-Feedback */}
          <div className="absolute right-8 top-4 w-48 rounded-rad-sm border border-line bg-card p-3 shadow-lift">
            <div className="mb-2 flex items-center gap-2">
              <svg
                width="14"
                height="14"
                viewBox="0 0 20 20"
                fill="none"
                className="text-accent"
              >
                <path
                  d="M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8L10 2z"
                  fill="currentColor"
                />
              </svg>
              <span className="text-xs font-medium text-ink">KI-Feedback</span>
            </div>
            <div className="text-xs text-ink-soft">
              Achte auf{' '}
              <span
                className="font-medium"
                style={{ color: 'var(--accent-ink)' }}
              >
                Konjunktiv II
              </span>{' '}
              {'— hier passt „wäre“ besser als „war“.'}
            </div>
          </div>
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
