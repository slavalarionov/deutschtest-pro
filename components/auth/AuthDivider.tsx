interface AuthDividerProps {
  label: string
}

/** Hairline OR separator used between OAuth and email form. */
export function AuthDivider({ label }: AuthDividerProps) {
  return (
    <div className="my-6 flex items-center gap-4">
      <div className="h-px flex-1 bg-line" />
      <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
        {label}
      </span>
      <div className="h-px flex-1 bg-line" />
    </div>
  )
}
