'use client'

import type { ReactNode } from 'react'

/**
 * Editorial modal shell. Overlay (bg-ink/40 + backdrop-blur), card with
 * rounded-rad border line bg-card, title + close button.
 *
 * Originally lived in app/admin/users/users-table.tsx; extracted so promo,
 * economy, and future admin screens can reuse it without duplicating styles.
 */
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-rad border border-line bg-card p-8 shadow-lift"
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <h3 className="font-display text-xl tracking-tight text-ink">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="-m-2 p-2 text-muted transition-colors hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  )
}

export function ModalField({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block rounded-rad-sm border border-line bg-card px-3 py-2 transition-colors focus-within:border-ink">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </div>
      {children}
    </label>
  )
}
