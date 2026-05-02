export type AdminIconName =
  | 'dashboard'
  | 'users'
  | 'referral-sources'
  | 'prompts'
  | 'topics'
  | 'learning-resources'
  | 'promo'
  | 'economy'
  | 'fixed-costs'
  | 'feedback'

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
    'referral-sources': (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m10 14 4-8 2 8z" />
        <path d="M10 14h6" />
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
    'learning-resources': (
      <>
        <path d="M4 5a2 2 0 0 1 2-2h6v16H6a2 2 0 0 1-2-2V5z" />
        <path d="M20 5a2 2 0 0 0-2-2h-6v16h6a2 2 0 0 0 2-2V5z" />
        <path d="M12 3v16" />
      </>
    ),
    promo: (
      <>
        <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9z" />
        <path d="M9 9v1" />
        <path d="M9 14v1" />
      </>
    ),
    economy: (
      <>
        <ellipse cx="12" cy="6.5" rx="7" ry="2.5" />
        <path d="M5 6.5v4c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-4" />
        <path d="M5 10.5v4c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-4" />
        <path d="M5 14.5v3c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-3" />
      </>
    ),
    'fixed-costs': (
      <>
        <rect x="4" y="6" width="16" height="14" rx="2" />
        <path d="M4 10h16" />
        <path d="M9 14h2" />
        <path d="M9 17h6" />
        <path d="M8 6V4" />
        <path d="M16 6V4" />
      </>
    ),
    feedback: (
      <>
        <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6l-4 3v-3H6a2 2 0 0 1-2-2V6z" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
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
