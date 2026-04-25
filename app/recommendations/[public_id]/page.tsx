import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createServerClient } from '@/lib/supabase-server'
import { formatEditorialDate } from '@/lib/format/date'
import { getTagLabel } from '@/lib/learning-tags'
import type { WeakArea } from '@/lib/claude'
import type { MatchedResource, MatchedResourcesIndex } from '@/lib/recommendations/snapshot'
import type { Locale } from '@/i18n/request'

interface PublicRecommendationData {
  weakAreas: WeakArea[]
  summaryText: string
  matchedResources: MatchedResourcesIndex
  generatedAt: string
  attemptsCount: number
  locale: Locale
}

async function loadPublicRecommendation(
  publicId: string,
): Promise<PublicRecommendationData | null> {
  const supabase = createServerClient()
  const { data: row } = await supabase
    .from('user_recommendations')
    .select(
      'weak_areas, summary_text, matched_resources, generated_at, attempts_count, language, is_public, public_id',
    )
    .eq('public_id', publicId)
    .maybeSingle()

  if (!row || !row.is_public) return null

  return {
    weakAreas: row.weak_areas as unknown as WeakArea[],
    summaryText: row.summary_text,
    matchedResources: row.matched_resources as unknown as MatchedResourcesIndex,
    generatedAt: row.generated_at,
    attemptsCount: row.attempts_count,
    locale: row.language as Locale,
  }
}

const SEVERITY_COLOR: Record<WeakArea['severity'], string> = {
  high: 'var(--error)',
  medium: 'var(--warn)',
  low: 'var(--accent)',
}

export async function generateMetadata({
  params,
}: {
  params: { public_id: string }
}): Promise<Metadata> {
  const data = await loadPublicRecommendation(params.public_id)
  if (!data) return { title: 'DeutschTest.pro' }

  const title = `Mein Lernplan · DeutschTest.pro`
  const description = `${data.weakAreas.length} Wachstumsfelder identifiziert. KI-gestützter Lernpfad für das Goethe-Zertifikat.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'DeutschTest.pro',
      locale: 'de_DE',
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: false, follow: false },
  }
}

export default async function PublicRecommendationsPage({
  params,
}: {
  params: { public_id: string }
}) {
  const data = await loadPublicRecommendation(params.public_id)
  if (!data) notFound()

  const { locale, weakAreas, summaryText, matchedResources, generatedAt, attemptsCount } = data

  const [t, tModules, tPublic, tTypes] = await Promise.all([
    getTranslations({ locale, namespace: 'dashboard.recommendations' }),
    getTranslations({ locale, namespace: 'modules' }),
    getTranslations({ locale, namespace: 'recommendations.public' }),
    getTranslations({ locale, namespace: 'recommendations.resourceTypes' }),
  ])

  const dateLabel = formatEditorialDate(generatedAt, locale).toLocaleUpperCase(locale)
  const homeHref = locale === 'de' ? '/' : `/${locale}`

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex items-baseline justify-between gap-4">
          <div className="space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {tPublic('eyebrow')}
            </div>
            <h1 className="font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
              {tPublic('headline')}
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {t('meta.modulesConsidered', { count: attemptsCount })}
              {' · '}
              {t('meta.generatedAt', { date: dateLabel })}
            </p>
          </div>
          <Link
            href={homeHref}
            className="font-mono text-[10px] uppercase tracking-widest text-muted hover:text-ink"
          >
            DeutschTest.pro
          </Link>
        </header>

        {/* Summary */}
        <section className="rounded-rad border border-line bg-card p-6 sm:p-10">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {tPublic('summaryEyebrow')}
          </div>
          <p className="mt-4 whitespace-pre-wrap text-lg leading-relaxed text-ink">
            {summaryText}
          </p>
        </section>

        {/* Weak areas + resources */}
        <section className="space-y-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            {tPublic('areasEyebrow', { count: weakAreas.length })}
          </div>

          {weakAreas.map((area, i) => {
            const key = `${area.module}:${area.level}:${area.topic}`
            const resources = matchedResources[key] ?? []
            const moduleLabel = tModules(area.module)
            const tagLabel = getTagLabel(area.topic, locale)

            return (
              <article
                key={i}
                className="rounded-rad border border-l-2 border-line bg-card p-6 sm:border-l-4 sm:p-8"
                style={{ borderLeftColor: SEVERITY_COLOR[area.severity] }}
              >
                <div className="flex flex-wrap items-baseline gap-3 font-mono text-[10px] uppercase tracking-widest text-muted">
                  <span>{moduleLabel.toLocaleUpperCase(locale)}</span>
                  <span>·</span>
                  <span>{area.level.toUpperCase()}</span>
                  <span>·</span>
                  <span style={{ color: SEVERITY_COLOR[area.severity] }}>
                    {tPublic(`severity.${area.severity}`)}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-3xl leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
                  {tagLabel}
                </h2>
                <p className="mt-3 text-base leading-relaxed text-ink-soft">
                  {area.reason}
                </p>

                {resources.length === 0 ? (
                  <div className="mt-6 border-t border-line-soft pt-4">
                    <p className="text-sm italic text-muted">
                      {tPublic('resourcesEmpty')}
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-3 border-t border-line-soft pt-4">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
                      {tPublic('resourcesLabel')}
                    </div>
                    <ul className="space-y-3">
                      {resources.map((r) => (
                        <ResourceCard key={r.id} resource={r} typeLabel={tTypes(r.resource_type)} />
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            )
          })}
        </section>

        {/* Footer CTA */}
        <section className="rounded-rad border border-line bg-surface p-8 text-center sm:p-10">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            DeutschTest.pro
          </div>
          <h2 className="mt-4 font-display text-3xl leading-tight tracking-[-0.02em] text-ink sm:text-4xl">
            {tPublic('cta')}
          </h2>
          <p className="mt-3 text-sm text-muted">{tPublic('ctaSubtitle')}</p>
          <Link
            href={homeHref}
            className="mt-6 inline-flex rounded-rad-pill bg-ink px-8 py-3 text-sm font-medium text-page transition-colors hover:bg-ink/90"
          >
            {tPublic('ctaButton')}
          </Link>
        </section>
      </div>
    </div>
  )
}

function ResourceCard({
  resource,
  typeLabel,
}: {
  resource: MatchedResource
  typeLabel: string
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-ink-soft"
      />
      <div className="min-w-0 flex-1">
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-ink underline underline-offset-4 transition-colors hover:text-accent-ink"
        >
          {resource.title}
        </a>
        <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          {typeLabel}
        </span>
        {resource.description && (
          <p className="mt-1 text-sm text-ink-soft">{resource.description}</p>
        )}
      </div>
    </li>
  )
}
