export type StatusChipVariant =
  | 'admin'
  | 'unlimited'
  | 'blocked'
  | 'regular'
  | 'active'
  | 'neutral'

/**
 * Editorial status pill with a dot indicator.
 * Used across /admin/users list & detail, /admin/prompts (active version),
 * /admin/topics (active flag). Shared so future promo / economy tables can
 * reuse without re-styling.
 *
 * Variants:
 *   admin      — filled cobalt dot (primary role)
 *   unlimited  — outlined cobalt dot (secondary role)
 *   blocked    — solid ink dot (restrictive)
 *   regular    — muted dot (neutral default)
 *   active     — filled cobalt dot (used for "активная версия" of prompt)
 *   neutral    — line-colored dot (generic badge)
 */
export function StatusChip({
  variant,
  children,
}: {
  variant: StatusChipVariant
  children: React.ReactNode
}) {
  const dotClass =
    variant === 'admin' || variant === 'active'
      ? 'bg-accent'
      : variant === 'unlimited'
        ? 'bg-card ring-1 ring-accent-ink'
        : variant === 'blocked'
          ? 'bg-ink'
          : variant === 'regular'
            ? 'bg-muted'
            : 'bg-line'

  return (
    <span className="inline-flex items-center gap-1.5 rounded-rad-pill border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-soft">
      <span aria-hidden="true" className={`block h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {children}
    </span>
  )
}
