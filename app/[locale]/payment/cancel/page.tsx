import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import type { Locale } from '@/i18n/request'

export const dynamic = 'force-dynamic'

export default async function PaymentCancelPage({
  params,
}: {
  params: { locale: Locale }
}) {
  const t = await getTranslations({
    locale: params.locale,
    namespace: 'payment.cancel',
  })

  return (
    <main className="min-h-screen bg-page">
      <section className="mx-auto max-w-xl px-4 py-24">
        <p className="eyebrow text-center">{t('eyebrow')}</p>
        <div className="mt-6 rounded-rad border border-line bg-card p-8 text-center">
          <h1 className="font-display text-4xl tracking-tight text-ink">
            {t('title')}
          </h1>
          <p className="mt-3 text-ink-soft">{t('subtitle')}</p>
          <Link
            href="/pricing"
            className="mt-8 inline-flex items-center gap-2 rounded-rad-pill bg-ink px-6 py-3 text-sm font-medium text-card transition-opacity hover:opacity-90"
          >
            {t('tryAgain')}
          </Link>
        </div>
      </section>
    </main>
  )
}
