import { useTranslations } from 'next-intl'

/**
 * Landing · Module grid (Phase 3 editorial redesign).
 *
 * Portes the `LandingModules` section from docs/Redesign.html (lines 411-455):
 * a 4-column grid of exam modules where each card carries a large grapheme
 * initial, a minimalist inline-SVG icon, and structural meta (duration / parts).
 *
 * Static content → no client hooks, stays a Server Component.
 */

type ModuleKey = 'lesen' | 'horen' | 'schreiben' | 'sprechen'

const MODULE_KEYS: readonly ModuleKey[] = ['lesen', 'horen', 'schreiben', 'sprechen'] as const

// Static subtitles under the module name. Goethe-Institut uses these German
// long-form names officially (Leseverstehen etc.), so they stay in German
// across all locales — same rationale as keeping "Lesen / Hören / Schreiben /
// Sprechen" as the canonical module names.
const MODULE_LONG_NAME: Record<ModuleKey, string> = {
  lesen: 'Leseverstehen',
  horen: 'Hörverstehen',
  schreiben: 'Schriftlicher Ausdruck',
  sprechen: 'Mündlicher Ausdruck',
}

// Initial letter rendered as an oversized grapheme in the card corner.
const MODULE_INITIAL: Record<ModuleKey, string> = {
  lesen: 'L',
  horen: 'H',
  schreiben: 'S',
  sprechen: 'S',
}

/**
 * Minimalist 18px stroke icons (lucide-style). Inline SVG to avoid adding a
 * new dependency for four glyphs.
 */
function ModuleIcon({ kind }: { kind: ModuleKey }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (kind) {
    case 'lesen':
      // book — two pages
      return (
        <svg {...common}>
          <path d="M4 5a1 1 0 0 1 1-1h5a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4V5Z" />
          <path d="M20 5a1 1 0 0 0-1-1h-5a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6V5Z" />
        </svg>
      )
    case 'horen':
      // headphones
      return (
        <svg {...common}>
          <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
          <path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5Z" />
          <path d="M20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" />
        </svg>
      )
    case 'schreiben':
      // pen
      return (
        <svg {...common}>
          <path d="M15.5 4.5 19.5 8.5l-11 11-4.5 1 1-4.5 11-11Z" />
          <path d="M13.5 6.5 17.5 10.5" />
        </svg>
      )
    case 'sprechen':
      // microphone
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
          <path d="M9 21h6" />
        </svg>
      )
  }
}

export function FeaturesSection() {
  const t = useTranslations('landing.features')

  return (
    <section
      id="features"
      className="bg-page px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mb-10 flex flex-col gap-6 sm:mb-14 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div>
            <div className="eyebrow mb-3">01 — MODULE</div>
            <h2 className="font-display text-4xl leading-none tracking-tighter text-ink sm:text-5xl lg:text-[64px]">
              {t('titleStrong')}
              <br />
              <span className="text-muted">{t('titleMuted')}</span>
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft lg:text-right">
            {t('subtitle')}
          </p>
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {MODULE_KEYS.map((key, i) => (
            <article
              key={key}
              className="relative flex min-h-[18rem] flex-col justify-between overflow-hidden rounded-rad border border-line bg-card p-6 transition-colors hover:border-ink/20 md:h-80"
            >
              {/* Top: index + icon */}
              <div>
                <div className="flex items-center justify-between text-ink-soft">
                  <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
                    0{i + 1}
                  </span>
                  <ModuleIcon kind={key} />
                </div>

                {/* Module name */}
                <div className="mt-12 font-display text-[42px] leading-none tracking-tight text-ink sm:mt-16">
                  {t(`items.${key}.title`)}
                </div>
                <div className="mt-1 text-sm text-muted">
                  {MODULE_LONG_NAME[key]}
                </div>
              </div>

              {/* Bottom: structural meta */}
              <div className="relative z-10 flex items-center justify-between font-mono text-xs text-muted">
                <span>{t(`items.${key}.duration`)}</span>
                <span>{t(`items.${key}.parts`)}</span>
              </div>

              {/* Oversized grapheme initial */}
              <span
                aria-hidden
                className="pointer-events-none absolute -bottom-6 -right-6 select-none font-display leading-none tracking-tighter"
                style={{ fontSize: 160, color: 'var(--line)' }}
              >
                {MODULE_INITIAL[key]}
              </span>
            </article>
          ))}
        </div>

        {/* Explanatory note (Apple-style centered manifesto): muted body with
            the lead phrase set in solid ink. Larger leading + wider text-wrap
            so the block reads as a separate beat from the module grid. */}
        <p className="mx-auto mt-16 max-w-4xl text-balance text-center text-xl leading-relaxed text-ink-soft sm:mt-24 sm:text-2xl sm:leading-[1.45]">
          {t.rich('modulesNote', {
            strong: (chunks) => (
              <strong className="font-semibold text-ink">{chunks}</strong>
            ),
          })}
        </p>
      </div>
    </section>
  )
}
