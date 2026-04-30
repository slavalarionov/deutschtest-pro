import type { Praedikat } from '@/lib/grading/praedikat'

interface Props {
  praedikat: Praedikat
  /** Localized label shown small in parentheses next to the German one. Pass
   *  the same string as `praedikat.labelDe` (or null) to suppress the suffix
   *  on the German locale. */
  translation?: string | null
  size?: 'lg' | 'md'
}

export function ScorePraedikat({ praedikat, translation, size = 'lg' }: Props) {
  const showTranslation =
    typeof translation === 'string' &&
    translation.trim().length > 0 &&
    translation !== praedikat.labelDe

  const valueClass =
    size === 'lg'
      ? 'font-display text-3xl leading-tight tracking-[-0.02em] sm:text-4xl'
      : 'font-display text-2xl leading-tight tracking-[-0.02em]'

  return (
    <div data-testid="score-praedikat" className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-2">
        <span
          data-praedikat-level={praedikat.level}
          className={valueClass}
          style={{ color: praedikat.cssColor }}
        >
          {praedikat.labelDe}
        </span>
        {showTranslation && (
          <span className="text-sm text-muted">({translation})</span>
        )}
      </div>
    </div>
  )
}
