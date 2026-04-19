/**
 * Editorial date formatter used across the dashboard (history table, test
 * detail header, score card).
 *
 * Produces `19 APR 2026`-style output instead of the native `19.04.2026`.
 * The month abbreviation is taken from the locale's short-month format,
 * stripped of a trailing dot (German/Russian add `.`), and uppercased
 * with `toLocaleUpperCase(locale)` so Turkish `Nis` correctly becomes
 * `NİS` (capital I with dot) rather than the ASCII `NIS`.
 *
 * Accepts a `Date` or an ISO string. On a bad input we return an em-dash
 * so the UI never shows `Invalid Date`.
 */
export function formatEditorialDate(
  date: Date | string,
  locale: string,
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '—'

  const day = d.getDate()
  const year = d.getFullYear()
  const month = d
    .toLocaleDateString(locale, { month: 'short' })
    .replace('.', '')
    .toLocaleUpperCase(locale)

  return `${day} ${month} ${year}`
}

/**
 * Long-form editorial month/year formatter used in the settings screen
 * ("MITGLIED · APRIL 2026" / "УЧАСТНИК · АПРЕЛЬ 2026" / "ÜYE · NİSAN 2026").
 *
 * Russian note: `Intl.DateTimeFormat` with `{ month: 'long' }` can return the
 * genitive form in some browser ICU builds (e.g. `апреля` instead of `апрель`).
 * Since this label is shown standalone (not as part of a full date like
 * "19 апреля"), we want the nominative form. We override the Russian output
 * with an explicit nominative table. Turkish still uses `toLocaleUpperCase`
 * so `Nisan` becomes `NİSAN` (dotted capital İ).
 */
const RU_MONTHS_NOMINATIVE_UPPER = [
  'ЯНВАРЬ',
  'ФЕВРАЛЬ',
  'МАРТ',
  'АПРЕЛЬ',
  'МАЙ',
  'ИЮНЬ',
  'ИЮЛЬ',
  'АВГУСТ',
  'СЕНТЯБРЬ',
  'ОКТЯБРЬ',
  'НОЯБРЬ',
  'ДЕКАБРЬ',
] as const

export function formatEditorialMonthYear(
  date: Date | string,
  locale: string,
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '—'

  const year = d.getFullYear()

  if (locale.startsWith('ru')) {
    return `${RU_MONTHS_NOMINATIVE_UPPER[d.getMonth()]} ${year}`
  }

  const month = d
    .toLocaleDateString(locale, { month: 'long' })
    .toLocaleUpperCase(locale)

  return `${month} ${year}`
}
