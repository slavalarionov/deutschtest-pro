import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/require-admin'
import {
  loadReferralSourceStats,
  SOURCE_LABELS_RU,
  type PeriodFilter,
} from '@/lib/admin/referral-sources'

export const dynamic = 'force-dynamic'

const PERIOD_OPTIONS: ReadonlyArray<{ value: PeriodFilter; label: string }> = [
  { value: 'all', label: 'Всё время' },
  { value: '30d', label: '30 дней' },
  { value: '7d', label: '7 дней' },
  { value: 'today', label: 'Сегодня' },
] as const

function parsePeriod(v: string | undefined): PeriodFilter {
  return v === 'today' || v === '7d' || v === '30d' ? v : 'all'
}

function reactionForConversion(
  asked: number,
  conversion: number | null,
): string {
  if (asked < 10) return 'Данных мало — ждём ответы'
  if (conversion === null) return 'Нет данных'
  if (conversion >= 0.6) return 'Высокая конверсия — модалка работает хорошо'
  if (conversion >= 0.3) return 'Нормальная конверсия'
  return 'Низкая конверсия — возможно, стоит пересмотреть UX модалки'
}

function formatPct(v: number, digits = 1): string {
  return `${v.toFixed(digits)}%`
}

export default async function AdminReferralSourcesPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  await requireAdminPage('/admin/referral-sources')

  const period = parsePeriod(searchParams.period)
  const stats = await loadReferralSourceStats(period)
  const { total, breakdown } = stats

  const conversionPct = total.conversion !== null ? total.conversion * 100 : null
  const maxCount = Math.max(...breakdown.map((b) => b.count), 0)
  const skippedPct = total.asked > 0 ? (total.skipped / total.asked) * 100 : 0

  return (
    <div className="max-w-5xl space-y-12">
      <header>
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Admin · attribution
        </div>
        <h1 className="mt-3 font-display text-[44px] leading-[1.05] tracking-[-0.03em] text-ink sm:text-5xl md:text-6xl">
          Источники.
          <br />
          <span className="text-ink-soft">Откуда приходят пользователи.</span>
        </h1>
      </header>

      {/* Period segment control */}
      <nav className="flex flex-wrap items-center gap-2">
        <span className="mr-2 font-mono text-[10px] uppercase tracking-widest text-muted">
          Период
        </span>
        {PERIOD_OPTIONS.map((opt) => {
          const active = opt.value === period
          const href =
            opt.value === 'all'
              ? '/admin/referral-sources'
              : `/admin/referral-sources?period=${opt.value}`
          return (
            <Link
              key={opt.value}
              href={href}
              className={`rounded-rad-pill px-3 py-1.5 text-sm transition-colors ${
                active
                  ? 'bg-ink text-page'
                  : 'text-ink-soft hover:bg-surface hover:text-ink'
              }`}
            >
              {opt.label}
            </Link>
          )
        })}
      </nav>

      {/* Summary */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Сводка
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard
            label="Зарегистрировано"
            value={total.registered.toLocaleString('ru-RU')}
            caption="За выбранный период"
          />
          <SummaryCard
            label="Показов модалки"
            value={total.asked.toLocaleString('ru-RU')}
            caption={
              total.registered > 0
                ? `${formatPct((total.asked / total.registered) * 100)} от зарегистрированных`
                : undefined
            }
          />
          <SummaryCard
            label="Ответов"
            value={total.answered.toLocaleString('ru-RU')}
            caption={
              conversionPct !== null
                ? `${formatPct(conversionPct)} конверсия`
                : 'нет показов'
            }
          />
        </div>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-muted">
          {total.answered.toLocaleString('ru-RU')} ответов из{' '}
          {total.asked.toLocaleString('ru-RU')} показов —{' '}
          {conversionPct !== null ? formatPct(conversionPct, 0) : '—'} конверсия
        </p>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted">
          {reactionForConversion(total.asked, total.conversion)}
        </p>
      </section>

      {/* Breakdown */}
      <section>
        <h2 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted">
          Распределение по источникам
        </h2>
        <h3 className="mb-6 font-display text-3xl leading-tight tracking-tight text-ink">
          Какие каналы приводят людей.
        </h3>

        <div className="overflow-hidden rounded-rad border border-line bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-surface">
              <tr className="font-mono text-[10px] uppercase tracking-widest text-muted">
                <th className="px-4 py-3 text-left font-normal">Источник</th>
                <th className="px-4 py-3 text-right font-normal">Ответов</th>
                <th className="px-4 py-3 text-right font-normal">%</th>
                <th className="px-4 py-3 text-left font-normal">Визуал</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((row) => {
                const isZero = row.count === 0
                const barWidth = maxCount > 0 ? (row.count / maxCount) * 100 : 0
                return (
                  <tr
                    key={row.source}
                    className="border-b border-line-soft last:border-0"
                  >
                    <td className={`px-4 py-3 ${isZero ? 'text-muted' : 'text-ink'}`}>
                      {SOURCE_LABELS_RU[row.source]}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-sm tabular-nums ${
                        isZero ? 'text-muted' : 'text-ink'
                      }`}
                    >
                      {row.count.toLocaleString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted">
                      {isZero ? '—' : formatPct(row.percent)}
                    </td>
                    <td className="px-4 py-3">
                      {isZero ? (
                        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                          нет ответов
                        </span>
                      ) : (
                        <div className="h-1 w-full bg-surface">
                          <div
                            className="h-1 bg-ink"
                            style={{ width: `${barWidth.toFixed(1)}%` }}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {/* Skipped — отдельной строкой с более заметной верхней рамкой */}
              <tr className="border-t-2 border-line">
                <td className="px-4 py-3 text-ink-soft">Пропущено</td>
                <td
                  className={`px-4 py-3 text-right font-mono text-sm tabular-nums ${
                    total.skipped === 0 ? 'text-muted' : 'text-ink'
                  }`}
                >
                  {total.skipped.toLocaleString('ru-RU')}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-muted">
                  {total.asked > 0 ? formatPct(skippedPct) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                    от показов модалки
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          Распределение ответов среди тех, кто выбрал вариант. Процент считается от
          числа ответивших, не от всех зарегистрированных. «Пропущено» — те, кто
          увидел модалку, но закрыл её без выбора; считается отдельно, чтобы не
          смазывать картину реальных каналов.
        </p>
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  caption,
}: {
  label: string
  value: string
  caption?: string
}) {
  return (
    <div className="rounded-rad border border-line bg-card p-6">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
        {label}
      </div>
      <div className="mt-3 font-display text-4xl tracking-tight tabular-nums text-ink">
        {value}
      </div>
      {caption && (
        <div className="mt-2 font-mono text-[11px] uppercase tracking-wider text-muted tabular-nums">
          {caption}
        </div>
      )}
    </div>
  )
}
