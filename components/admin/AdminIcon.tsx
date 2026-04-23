export type AdminIconName =
  | 'dashboard'
  | 'users'
  | 'prompts'
  | 'topics'
  | 'promo'

/**
 * Stroke-only 24×24 glyphs for the admin sidebar. Mirrors the `SidebarIcon`
 * pattern in DashboardShell: fill="none", 1.5px stroke, round caps/joins,
 * sized via className. Extend here when promo/economy/feedback pages land.
 */
export function AdminIcon({
  name,
  className = 'h-4 w-4',
}: {
  name: AdminIconName
  className?: string
}) {
  const paths: Record<AdminIconName, React.ReactNode> = {
    dashboard: (
      <>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <path d="M8 15l4-5 3 3 5-7" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3.25" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <path d="M16 11a3 3 0 0 0 0-6" />
        <path d="M20.5 19a5.5 5.5 0 0 0-4-5.3" />
      </>
    ),
    prompts: (
      <>
        <path d="M4 20l4-1 10-10-3-3L5 16l-1 4z" />
        <path d="M14 7l3 3" />
      </>
    ),
    topics: (
      <>
        <path d="M4 7h10" />
        <path d="M4 12h7" />
        <path d="M4 17h12" />
        <path d="M17 4l3 3-3 3" />
        <path d="M20 17l-3 3-3-3" />
      </>
    ),
    promo: (
      <>
        <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9z" />
        <path d="M9 9v1" />
        <path d="M9 14v1" />
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
      {paths[name]}
    </svg>
  )
}
