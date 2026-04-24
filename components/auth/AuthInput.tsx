'use client'

interface AuthInputProps {
  id: string
  type: string
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  disabled?: boolean
  autoComplete?: string
  icon?: 'mail' | 'lock'
  hint?: string
  minLength?: number
  maxLength?: number
  testId?: string
}

function MailIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      stroke="currentColor"
      fill="none"
      strokeWidth={1.5}
      strokeLinecap="round"
      className="h-4 w-4 shrink-0 text-muted"
    >
      <path d="M3 5h14a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V6a1 1 0 011-1z" />
      <path d="M2 6l8 5 8-5" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      stroke="currentColor"
      fill="none"
      strokeWidth={1.5}
      strokeLinecap="round"
      className="h-4 w-4 shrink-0 text-muted"
    >
      <rect x="4" y="9" width="12" height="9" rx="1.5" />
      <path d="M7 9V6a3 3 0 016 0v3" />
    </svg>
  )
}

/** Labeled input with optional leading mail/lock icon — editorial styling. */
export function AuthInput({
  id,
  type,
  label,
  placeholder,
  value,
  onChange,
  required,
  disabled,
  autoComplete,
  icon,
  hint,
  minLength,
  maxLength,
  testId,
}: AuthInputProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block font-mono text-[11px] uppercase tracking-wide text-muted"
      >
        {label}
      </label>
      <div className="flex items-center gap-3 rounded-rad-sm border border-line bg-card px-3 py-2.5 transition-colors focus-within:border-ink focus-within:ring-1 focus-within:ring-ink">
        {icon === 'mail' && <MailIcon />}
        {icon === 'lock' && <LockIcon />}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          minLength={minLength}
          maxLength={maxLength}
          data-testid={testId}
          className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none disabled:opacity-50"
        />
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  )
}
