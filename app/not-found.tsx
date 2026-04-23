import Link from 'next/link'

export default function RootNotFound() {
  return (
    <div
      data-testid="error-page-404"
      className="flex min-h-screen flex-col items-center justify-center bg-page px-4 py-20"
    >
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          404 · NICHT GEFUNDEN
        </div>
        <h1 className="font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          Seite
          <br />
          <span className="text-ink-soft">nicht gefunden.</span>
        </h1>
        <p className="mx-auto max-w-md text-base leading-relaxed text-muted">
          Diese Adresse führt ins Leere. Vielleicht ist die Seite umgezogen oder der Link ist nicht mehr gültig.
        </p>
        <Link
          href="/"
          data-testid="error-cta-home"
          className="rounded-rad-pill bg-ink px-8 py-3 text-sm font-medium text-card transition-colors hover:bg-ink/90"
        >
          Zur Startseite
        </Link>
      </div>
    </div>
  )
}
