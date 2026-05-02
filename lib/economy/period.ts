/**
 * Pure helpers для селектора периода — БЕЗ 'use client'.
 *
 * Жили рядом с компонентом PeriodSelector, но Next App Router помечает
 * ВСЕ экспорты из 'use client'-файла как client-references — server
 * components не могут их вызывать как обычные функции (получают
 * "m is not a function" в production minified bundle).
 *
 * Поэтому helpers здесь, а сам компонент `<PeriodSelector>` — там.
 * И он, и server-компоненты страниц импортируют отсюда одно и то же.
 */

export type EconomyPeriod = '7d' | '30d' | '90d' | 'all'

export const ALL_PERIOD_DAYS = 365

export const PERIOD_OPTIONS: ReadonlyArray<{ id: EconomyPeriod; label: string }> = [
  { id: '7d', label: '7 дней' },
  { id: '30d', label: '30 дней' },
  { id: '90d', label: '90 дней' },
  { id: 'all', label: 'Всё время' },
]

export function periodToDays(period: EconomyPeriod): number {
  switch (period) {
    case '7d':
      return 7
    case '30d':
      return 30
    case '90d':
      return 90
    case 'all':
      return ALL_PERIOD_DAYS
  }
}

export function parsePeriod(raw: string | string[] | undefined): EconomyPeriod {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === '7d' || value === '30d' || value === '90d' || value === 'all') {
    return value
  }
  return '30d'
}

export function periodLabel(period: EconomyPeriod): string {
  return PERIOD_OPTIONS.find((o) => o.id === period)?.label ?? '30 дней'
}
