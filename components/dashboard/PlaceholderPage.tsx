interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-brand-text">{title}</h1>
      <p className="mt-2 text-sm text-brand-muted">{description}</p>
      <div className="mt-8 rounded-2xl border border-dashed border-brand-border bg-brand-white p-10 text-center">
        <p className="text-sm font-medium text-brand-text">
          Dieser Bereich wird bald verfügbar sein.
        </p>
        <p className="mt-2 text-xs text-brand-muted">
          Wir arbeiten an der nächsten Ausbaustufe Ihres Kontos.
        </p>
      </div>
    </div>
  )
}
