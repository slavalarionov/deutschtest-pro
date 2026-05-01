'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, useReducedMotion } from 'framer-motion'

/**
 * Landing · RecommendationsSection — "Персональные рекомендации.
 * ИИ видит каждую вашу ошибку — и знает, что подтянуть."
 *
 * Two-column on lg+: left is an Apple-style typographic manifesto with mixed
 * bold + italic-display emphasis; right is a stylised browser-frame mockup of
 * the public recommendations page. On mobile (< lg) the columns stack with the
 * mockup ALWAYS rendered above the manifesto copy.
 *
 * Pill / chip styling (weak / neutral / strong category cells) replicates the
 * tone tokens used on the real recommendations UI:
 *   - app/recommendations/[public_id]/page.tsx  → SEVERITY_COLOR map
 *     (high → --error, medium → --warn, low → --accent).
 *   - components/recommendations/LearningAdviceCard.tsx → callout tone vars
 *     (warn → --warn, error → --error, success → --success).
 * We keep cool monochrome only: weak → --error-soft, neutral → --surface,
 * strong → --accent-soft. No new tokens introduced.
 *
 * Animation: pill cards fade + slide up 8px with a left-to-right / top-to-
 * bottom 80ms stagger when the section enters the viewport (threshold 0.3);
 * the AI verdict quote does a simple fade-in. prefers-reduced-motion is
 * respected — both treatments collapse to instant render.
 */

type PillStatus = 'weak' | 'neutral' | 'strong'

const PILLS: ReadonlyArray<{ key: string; term: string; pct: number; status: PillStatus }> = [
  // Order matches the 2×3 grid (left-to-right, top-to-bottom) so the stagger
  // reads naturally. Two of each status, alternating across the rows.
  { key: 'modalverben', term: 'Modalverben', pct: 38, status: 'weak' },
  { key: 'praepositionen', term: 'Präpositionen', pct: 65, status: 'neutral' },
  { key: 'konjunktiv2', term: 'Konjunktiv II', pct: 92, status: 'strong' },
  { key: 'konnektoren', term: 'Konnektoren', pct: 38, status: 'weak' },
  { key: 'wortstellung', term: 'Wortstellung', pct: 65, status: 'neutral' },
  { key: 'plural', term: 'Plural', pct: 92, status: 'strong' },
]

// Tone-to-token map. Inline style is used (not Tailwind classes) so we hit the
// exact CSS variables already declared in app/globals.css and don't introduce
// new tokens or new Tailwind colour keys.
const PILL_STYLE: Record<PillStatus, { bg: string; ring: string; ink: string; dot: string }> = {
  weak: {
    bg: 'var(--error-soft)',
    ring: 'color-mix(in oklch, var(--error) 30%, transparent)',
    ink: 'var(--error)',
    dot: 'var(--error)',
  },
  neutral: {
    bg: 'var(--surface)',
    ring: 'var(--line)',
    ink: 'var(--ink-soft)',
    dot: 'var(--muted)',
  },
  strong: {
    bg: 'var(--accent-soft)',
    ring: 'color-mix(in oklch, var(--accent) 30%, transparent)',
    ink: 'var(--accent-ink)',
    dot: 'var(--accent)',
  },
}

export function RecommendationsSection() {
  const t = useTranslations('landing.recommendations')
  const reducedMotion = useReducedMotion() ?? false
  const sectionRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const node = sectionRef.current
    if (!node) return
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true)
            obs.disconnect()
            break
          }
        }
      },
      { threshold: 0.3 },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  const animate = inView && !reducedMotion

  return (
    <section
      id="recommendations"
      ref={sectionRef}
      className="bg-page px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header — same idiom as ProgressSection / ModulesDetailSection.
            Eyebrow is left numberless on purpose; the main agent renumbers all
            sections in a follow-up pass. */}
        <div className="mb-12 sm:mb-16 lg:mb-20">
          <div className="eyebrow mb-3">{t('eyebrow')}</div>
          <h2 className="font-display text-4xl leading-none tracking-tighter text-ink sm:text-5xl lg:text-[64px]">
            {t('titleStrong')}
            <br />
            <span className="italic text-muted">{t('titleMuted')}</span>
          </h2>
        </div>

        {/* Two-column grid. Mock first in DOM so it renders above the text on
            mobile (order-1 / order-2 below). On lg+ the mock sits in the right
            column. */}
        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Manifesto column — narrow Apple-style measure */}
          <div className="order-2 lg:order-1 lg:col-span-5">
            <div className="space-y-6 text-base leading-relaxed text-ink-soft sm:text-lg">
              {(['line1', 'line2', 'line3', 'line4', 'line5'] as const).map((k) => (
                <p key={k} className="max-w-md">
                  {t.rich(`manifesto.${k}`, {
                    bold: (chunks) => (
                      <strong className="font-semibold text-ink">{chunks}</strong>
                    ),
                    italic: (chunks) => (
                      <em className="font-display italic">{chunks}</em>
                    ),
                  })}
                </p>
              ))}
            </div>
          </div>

          {/* Mockup column */}
          <div className="order-1 lg:order-2 lg:col-span-7">
            <BrowserMock animate={animate} t={t} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================
// Browser-frame mockup
// ============================================================

function BrowserMock({
  animate,
  t,
}: {
  animate: boolean
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="rounded-rad border border-accent/25 bg-card shadow-lift ring-1 ring-accent/10">
      {/* Browser chrome: 3 dots + URL pill */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            aria-hidden
            className="block h-2.5 w-2.5 rounded-full"
            style={{ background: 'var(--error)' }}
          />
          <span
            aria-hidden
            className="block h-2.5 w-2.5 rounded-full"
            style={{ background: 'var(--warn)' }}
          />
          <span
            aria-hidden
            className="block h-2.5 w-2.5 rounded-full"
            style={{ background: 'var(--success)' }}
          />
        </div>
        <div className="flex-1 truncate rounded-rad-pill bg-surface px-3 py-1 text-center font-mono text-[10px] tracking-wide text-ink-soft">
          {t('browser.url')}
        </div>
        {/* Right spacer keeps the URL pill optically centred against the
            three dots on the left. */}
        <div aria-hidden className="hidden h-2.5 w-[42px] sm:block" />
      </div>

      {/* Mock body */}
      <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
        {/* Header strip — eyebrow + one-line title (same idiom as the module
            mocks in ModulesDetailSection). */}
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {t('mock.eyebrow')}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {t('mock.timestamp')}
          </span>
        </div>
        <h3 className="font-display text-xl leading-tight tracking-tight text-ink sm:text-2xl">
          {t('mock.title')}
        </h3>

        {/* AI verdict quote — grey card, italic, with 4 highlighted grammar
            terms in bold cobalt. */}
        <motion.figure
          initial={animate ? { opacity: 0 } : false}
          animate={animate ? { opacity: 1 } : { opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="rounded-rad-sm bg-surface px-4 py-4 sm:px-5 sm:py-5"
        >
          <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
            {t('mock.verdictEyebrow')}
          </div>
          <blockquote className="font-display text-[15px] italic leading-relaxed text-ink sm:text-base">
            {t.rich('mock.verdict', {
              term: (chunks) => (
                <strong
                  className="font-semibold not-italic"
                  style={{ color: 'var(--accent-ink)' }}
                >
                  {chunks}
                </strong>
              ),
            })}
          </blockquote>
        </motion.figure>

        {/* 2×3 pill grid (3 cols × 2 rows on sm+, 2 cols × 3 rows below). */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
          {PILLS.map((pill, i) => {
            const tone = PILL_STYLE[pill.status]
            return (
              <motion.div
                key={pill.key}
                initial={animate ? { opacity: 0, y: 8 } : false}
                animate={animate ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: 0.25 + i * 0.08,
                  ease: 'easeOut',
                }}
                className="flex items-center justify-between gap-2 rounded-rad-sm border px-3 py-2.5"
                style={{
                  background: tone.bg,
                  borderColor: tone.ring,
                }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: tone.dot }}
                  />
                  <span
                    className="truncate font-mono text-[11px] font-medium tracking-tight"
                    style={{ color: tone.ink }}
                  >
                    {pill.term}
                  </span>
                </div>
                <span
                  className="shrink-0 font-mono text-[11px] tabular-nums"
                  style={{ color: tone.ink }}
                >
                  {pill.pct}%
                </span>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA strip — textual link, not a button. */}
        <motion.div
          initial={animate ? { opacity: 0 } : false}
          animate={animate ? { opacity: 1 } : { opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.85, ease: 'easeOut' }}
          className="border-t border-line pt-4"
        >
          <span
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider"
            style={{ color: 'var(--accent-ink)' }}
          >
            <span aria-hidden>→</span>
            {t('mock.share')}
          </span>
        </motion.div>
      </div>
    </div>
  )
}
