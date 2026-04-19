import type { ExamModule } from '@/types/exam'

type ModuleKey = ExamModule

/**
 * Stroke-only 24×24 glyphs for the four Goethe modules.
 * Matches the `SidebarIcon` pattern in DashboardShell: fill="none",
 * 1.5px stroke, round caps/joins. Size is driven by `className`
 * (defaults to 24px so callers can pass h-6 / h-[14px] etc).
 *
 * Used by ModuleLauncher (large tiles, 24px) and HistoryView (inline
 * row glyphs, 14px). Any third caller should join this component
 * instead of re-inlining the SVGs.
 */
export function ModuleIcon({
  module,
  className = 'h-6 w-6',
}: {
  module: ModuleKey
  className?: string
}) {
  const paths: Record<ModuleKey, React.ReactNode> = {
    lesen: (
      // open book — two mirrored pages
      <>
        <path d="M4 5h5a3 3 0 013 3v11a3 3 0 00-3-3H4V5z" />
        <path d="M20 5h-5a3 3 0 00-3 3v11a3 3 0 013-3h5V5z" />
      </>
    ),
    horen: (
      // headphones — arc + two cups
      <>
        <path d="M4 13v-1a8 8 0 0116 0v1" />
        <path d="M4 13h3v6H5a1 1 0 01-1-1v-5z" />
        <path d="M20 13h-3v6h2a1 1 0 001-1v-5z" />
      </>
    ),
    schreiben: (
      // fountain pen angled across the tile
      <>
        <path d="M4 20l4-1 10-10-3-3L5 16l-1 4z" />
        <path d="M14 7l3 3" />
      </>
    ),
    sprechen: (
      // microphone — capsule + support arc + stand
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0014 0" />
        <path d="M12 18v3" />
        <path d="M9 21h6" />
      </>
    ),
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[module]}
    </svg>
  )
}
