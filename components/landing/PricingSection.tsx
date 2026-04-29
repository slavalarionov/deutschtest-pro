import { getFormatter, getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { getPackagesForLocale, type PaymentPackage } from '@/lib/pricing'
import type { Locale } from '@/i18n/request'
import { CheckoutButton } from './CheckoutButton'

/**
 * Landing · Pricing section.
 *
 * Reads packages via `getPackagesForLocale(locale)` — RU locale gets the
 * RU bundle (10/20/40 modules at 400/720/1360 ₽), all other locales get
 * the EU bundle (20/33/50 modules at €10/€15/€20). On `ru` the CheckoutButton
 * wires up Точка acquiring; on EU locales it stays disabled until Prodamus.
 */
export async function PricingSection() {
  const locale = (await getLocale()) as Locale
  const t = await getTranslations('landing.pricing')
  const tPricing = await getTranslations('pricing')
  const format = await getFormatter()

  const packages = getPackagesForLocale(locale)

  return (
    <section
      id="pricing"
      className="bg-page px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-6 sm:mb-14 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div>
            <div className="eyebrow mb-3">{t('eyebrow')}</div>
            <h2 className="font-display text-4xl leading-none tracking-tighter text-ink sm:text-5xl lg:text-[64px]">
              {t('title')}
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-ink-soft lg:text-right">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              locale={locale}
              format={format}
              tPricing={tPricing}
            />
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl flex-col items-start gap-4 rounded-rad border border-dashed border-line bg-card p-6 sm:mt-14 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-rad-pill bg-accent-soft text-accent-ink"
            >
              <SparkIcon />
            </span>
            <p className="text-sm leading-relaxed text-ink">
              {tPricing('freeTrial.title')}
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex flex-none items-center gap-2 rounded-rad-pill bg-ink px-5 py-2.5 text-sm font-medium text-card transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-page"
          >
            {tPricing('freeTrial.cta')}
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </section>
  )
}

function PackageCard({
  pkg,
  locale,
  format,
  tPricing,
}: {
  pkg: PaymentPackage
  locale: Locale
  format: Awaited<ReturnType<typeof getFormatter>>
  tPricing: Awaited<ReturnType<typeof getTranslations>>
}) {
  const ns = `packages.${pkg.tier}` as const
  const featured = pkg.tier === 'standard'
  const hasBadge = pkg.tier !== 'starter'
  const featureCount = pkg.tier === 'starter' ? 3 : pkg.tier === 'standard' ? 4 : 5

  const priceMajor = pkg.priceMinor / 100
  const originalPriceMajor =
    pkg.originalPriceMinor != null ? pkg.originalPriceMinor / 100 : null

  const fracDigits = (n: number) =>
    pkg.currency === 'RUB' ? 0 : Number.isInteger(n) ? 0 : 2

  const priceStr = format.number(priceMajor, {
    style: 'currency',
    currency: pkg.currency,
    minimumFractionDigits: fracDigits(priceMajor),
    maximumFractionDigits: fracDigits(priceMajor),
  })
  const originalPriceStr =
    originalPriceMajor != null
      ? format.number(originalPriceMajor, {
          style: 'currency',
          currency: pkg.currency,
          minimumFractionDigits: fracDigits(originalPriceMajor),
          maximumFractionDigits: fracDigits(originalPriceMajor),
        })
      : null

  return (
    <article
      className={[
        'flex flex-col rounded-rad p-8',
        featured
          ? 'border border-ink bg-ink text-card'
          : 'border border-line bg-card text-ink',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-xl tracking-tight">
          {tPricing(`${ns}.name`)}
        </span>
        {hasBadge && (
          <span
            className={[
              'rounded-rad-pill px-3 py-1 text-[11px] font-medium uppercase tracking-wide',
              featured
                ? 'bg-accent-soft text-accent-ink'
                : 'border border-line-soft bg-surface text-ink-soft',
            ].join(' ')}
          >
            {tPricing(`${ns}.badge`)}
          </span>
        )}
      </div>

      <div className="mt-6">
        {originalPriceStr && (
          <div
            className={[
              'font-mono text-xs line-through',
              featured ? 'text-card/50' : 'text-muted',
            ].join(' ')}
          >
            {originalPriceStr}
          </div>
        )}
        <div
          className="font-display leading-none"
          style={{ fontSize: 72, letterSpacing: '-0.04em' }}
        >
          {priceStr}
        </div>
        <div
          className={[
            'mt-2 text-sm',
            featured ? 'text-card/70' : 'text-ink-soft',
          ].join(' ')}
        >
          {tPricing(`${ns}.priceNote`)}
        </div>
      </div>

      <ul className="mt-8 flex-1 space-y-3">
        {Array.from({ length: featureCount }, (_, idx) => idx + 1).map((n) => (
          <li
            key={n}
            className={[
              'flex items-start gap-3 text-sm',
              featured ? 'text-card/80' : 'text-ink-soft',
            ].join(' ')}
          >
            <CheckIcon className={featured ? 'text-card/70' : 'text-ink'} />
            <span>{tPricing(`${ns}.feature${n}`)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <CheckoutButton
          packageId={pkg.id}
          locale={locale}
          featured={featured}
          enabled={pkg.market === 'ru'}
          disabledLabel={tPricing('buyButton.comingSoon')}
          buyLabel={tPricing('ctaBuy')}
          redirectingLabel="Перенаправляем на страницу оплаты…"
          promoToggleLabel="У меня есть промокод"
          promoPlaceholder="WELCOME10"
          promoCheckingLabel="Проверяем…"
          promoAppliedLabel={(d, b) =>
            b > 0
              ? `Скидка ${d}%, +${b} бонусных модулей`
              : `Скидка ${d}% применена`
          }
          promoErrorLabels={{
            invalid_code_format: 'Код некорректный.',
            not_found: 'Промокод не найден.',
            inactive: 'Промокод отключён.',
            expired: 'Срок действия истёк.',
            limit_reached: 'Лимит активаций исчерпан.',
            already_redeemed: 'Вы уже использовали этот промокод.',
            wrong_flow: 'Этот промокод нельзя применить к покупке.',
            wrong_market: 'Промокод не подходит к этому рынку.',
            unauthorized: 'Сначала войдите в аккаунт.',
            network: 'Ошибка сети. Попробуйте ещё раз.',
            unknown: 'Не удалось проверить код.',
          }}
          fallbackErrorLabel="Не удалось создать платёж. Попробуйте ещё раз."
        />
      </div>
    </article>
  )
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={`mt-0.5 flex-none ${className}`}
    >
      <path
        d="M4 10.5l3.5 3.5L16 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 10h10M11 6l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SparkIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 2l1.8 5.2L17 9l-5.2 1.8L10 16l-1.8-5.2L3 9l5.2-1.8L10 2z"
        fill="currentColor"
      />
    </svg>
  )
}
