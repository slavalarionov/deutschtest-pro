import type { MatchedResource } from '@/lib/recommendations/snapshot'
import { getAdviceSectionLabels } from '@/types/learning-advice'

/**
 * Renders an advice-typed MatchedResource (resource_type='advice') as a
 * structured card with 5 sections. All sections always visible — visual
 * hierarchy via colored callouts (drill = warn, avoid = error, progress =
 * success). Used by the public recommendations page and the dashboard view.
 *
 * Falls back to a minimal title-only render if `body` is missing — should not
 * happen for advice rows in practice (SQL CHECK guards it) but stays safe.
 */
export function LearningAdviceCard({
  resource,
  locale,
}: {
  resource: MatchedResource
  locale: string
}) {
  const labels = getAdviceSectionLabels(locale)
  const body = resource.body

  if (!body) {
    return (
      <article className="rounded-rad border border-line bg-card p-5">
        <h3 className="font-medium text-ink">{resource.title}</h3>
        {resource.description && (
          <p className="mt-2 text-sm text-ink-soft">{resource.description}</p>
        )}
      </article>
    )
  }

  return (
    <article className="space-y-4 rounded-rad border border-line bg-card p-5 sm:p-6">
      <header>
        <h3 className="font-display text-xl leading-tight tracking-[-0.01em] text-ink sm:text-2xl">
          {resource.title}
        </h3>
        {resource.description && (
          <p className="mt-2 text-sm text-ink-soft">{resource.description}</p>
        )}
      </header>

      <Section eyebrow={labels.why}>
        <p className="text-sm leading-relaxed text-ink-soft">{body.why}</p>
      </Section>

      <Section eyebrow={labels.steps}>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-soft marker:text-muted">
          {body.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </Section>

      <Callout eyebrow={labels.drill} tone="warn">
        {body.drill}
      </Callout>

      <Callout eyebrow={labels.avoid} tone="error">
        {body.avoid}
      </Callout>

      <Callout eyebrow={labels.progress} tone="success">
        {body.progress}
      </Callout>
    </article>
  )
}

function Section({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        {eyebrow}
      </div>
      {children}
    </div>
  )
}

function Callout({
  eyebrow,
  tone,
  children,
}: {
  eyebrow: string
  tone: 'warn' | 'error' | 'success'
  children: React.ReactNode
}) {
  // Inline style to map tones to project CSS variables — keeps existing
  // design tokens (no Tailwind colour additions needed).
  const colorVar =
    tone === 'warn' ? 'var(--warn)' : tone === 'error' ? 'var(--error)' : 'var(--success)'

  return (
    <div
      className="rounded-rad-sm border-l-2 bg-surface/60 px-4 py-3"
      style={{ borderLeftColor: colorVar }}
    >
      <div
        className="mb-1 font-mono text-[10px] uppercase tracking-widest"
        style={{ color: colorVar }}
      >
        {eyebrow}
      </div>
      <p className="text-sm leading-relaxed text-ink">{children}</p>
    </div>
  )
}
