import Link from 'next/link'
import { getLocale, getTranslations } from 'next-intl/server'
import { defaultLocale } from '@/i18n/request'

/**
 * Root-level 404. Rendered when a URL doesn't match any segment in the app
 * tree (including `/{locale}/...` routes), so it can't rely on the <NextIntlClientProvider>
 * that wraps `[locale]/...`. We detect the locale explicitly via getLocale()
 * (reads NEXT_LOCALE cookie / Accept-Language) and pull translations with
 * getTranslations({locale, namespace}) so the copy matches the user's language.
 */
export default async function RootNotFound() {
  const locale = await getLocale()
  const t = await getTranslations({ locale, namespace: 'errorPages.notFound' })

  const homeHref = locale === defaultLocale ? '/' : `/${locale}`

  return (
    <div
      data-testid="error-page-404"
      className="flex min-h-screen flex-col items-center justify-center bg-page px-4 py-20"
    >
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          {t('eyebrow')}
        </div>
        <h1 className="text-balance font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          {t('titleLine1')}
          <br />
          <span className="text-ink-soft">{t('titleLine2')}</span>
        </h1>
        <p className="mx-auto max-w-md text-base leading-relaxed text-muted">
          {t('description')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            href={homeHref}
            data-testid="error-cta-home"
            className="rounded-rad-pill bg-ink px-8 py-3 text-sm font-medium text-card transition-colors hover:bg-ink/90"
          >
            {t('ctaHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
