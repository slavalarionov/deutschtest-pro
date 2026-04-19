import type { ReactNode } from 'react'
import { Link } from '@/i18n/routing'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'

interface AuthLayoutProps {
  /** Mono uppercase micro-label shown above the headline. */
  eyebrow: string
  /** Main portion of the headline (rendered in ink). */
  titleStrong: string
  /** Optional muted italic tail of the headline. */
  titleMuted?: string
  /** Optional lead paragraph under the headline. */
  lead?: string
  /** The form / main content. */
  children: ReactNode
  /** Optional slot rendered above the copyright line. */
  footer?: ReactNode
}

/**
 * Editorial two-column auth shell — left is form, right is the ü grapheme.
 * Port of the `AuthScreen` prototype from `docs/Redesign.html:574-657`.
 * Testimonial card intentionally dropped (no fictional reviews policy).
 */
export function AuthLayout({
  eyebrow,
  titleStrong,
  titleMuted,
  lead,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen bg-page">
      <div className="absolute right-4 top-4 z-50 sm:right-8 sm:top-6">
        <LanguageSwitcher />
      </div>

      <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left: form column */}
        <div className="flex flex-col justify-between p-6 sm:p-10 lg:p-14">
          {/* Top: brand wordmark */}
          <Link href="/" className="inline-flex items-center gap-1">
            <span className="font-display text-xl font-medium tracking-tight text-ink">
              DeutschTest
            </span>
            <span className="text-ink-soft">.pro</span>
          </Link>

          {/* Middle: eyebrow + headline + lead + form */}
          <div className="py-12">
            <span
              className="mb-6 inline-flex items-center gap-2 rounded-rad-pill border border-line bg-card px-3 py-1.5 text-xs font-medium"
              style={{ color: 'var(--muted)' }}
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-rad-pill bg-accent"
              />
              <span>{eyebrow}</span>
            </span>

            <h1 className="font-display text-[40px] font-normal leading-[1.02] tracking-tighter text-ink sm:text-[48px]">
              <span>{titleStrong}</span>
              {titleMuted && (
                <>
                  <span className="text-muted"> </span>
                  <span
                    className="italic text-muted"
                    style={{ fontWeight: 500 }}
                  >
                    {titleMuted}
                  </span>
                </>
              )}
            </h1>

            {lead && (
              <p className="mt-6 max-w-md text-base text-ink-soft sm:text-lg">
                {lead}
              </p>
            )}

            <div className="mt-10 w-full max-w-md">{children}</div>
          </div>

          {/* Bottom: optional slot + copyright */}
          <div className="mt-10">
            {footer && <div className="mb-6">{footer}</div>}
            <div className="text-xs text-muted">
              © {new Date().getFullYear()} DeutschTest.pro
            </div>
          </div>
        </div>

        {/* Right: graphic column */}
        <div className="relative hidden overflow-hidden bg-surface lg:block">
          {/* Unicode label — top-left */}
          <div className="absolute left-10 top-10 flex gap-2 font-mono text-[11px] text-muted">
            <span>U+00FC</span>
            <span>·</span>
            <span>LATIN SMALL LETTER U WITH DIAERESIS</span>
          </div>

          {/* Centered grapheme */}
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              className="font-display leading-none text-ink"
              style={{
                fontSize: 520,
                letterSpacing: '-0.06em',
                fontWeight: 400,
              }}
            >
              ü
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
