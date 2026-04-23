import { getTranslations } from 'next-intl/server'

export default async function Loading() {
  const t = await getTranslations('errorPages.loading')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-page px-4 py-20">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {t('eyebrow')}
        </div>
        <div className="space-y-3" aria-hidden="true">
          <div className="mx-auto h-3 w-3/4 animate-pulse rounded-rad-pill bg-surface" />
          <div className="mx-auto h-3 w-1/2 animate-pulse rounded-rad-pill bg-surface" />
        </div>
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          {t('label')}
        </p>
      </div>
    </div>
  )
}
