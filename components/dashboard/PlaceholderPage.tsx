import { getTranslations } from 'next-intl/server'

interface PlaceholderPageProps {
  title: string
  description: string
}

export async function PlaceholderPage({
  title,
  description,
}: PlaceholderPageProps) {
  const t = await getTranslations('dashboard.placeholder')
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-brand-text">{title}</h1>
      <p className="mt-2 text-sm text-brand-muted">{description}</p>
      <div className="mt-8 rounded-2xl border border-dashed border-brand-border bg-brand-white p-10 text-center">
        <p className="text-sm font-medium text-brand-text">{t('soon')}</p>
        <p className="mt-2 text-xs text-brand-muted">{t('soonHint')}</p>
      </div>
    </div>
  )
}
