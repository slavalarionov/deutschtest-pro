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
 * ("MITGLIED SEIT APRIL 2026" / "УЧАСТНИК С АПРЕЛЬ 2026" / etc.).
 *
 * Locale note: Russian `toLocaleDateString(… { month: 'long' })` returns the
 * genitive form (`апреля`). For an uppercase eyebrow we want the nominative
 * (`АПРЕЛЬ`), but since all slots are a single word the genitive reads fine in
 * caps as well; we keep the native form and uppercase it. Turkish uses
 * `toLocaleUpperCase(locale)` so `Nisan` becomes `NİSAN` (dotted capital İ)
 * rather than the ASCII `NISAN`.
 */
export function formatEditorialMonthYear(
  date: Date | string,
  locale: string,
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '—'

  const year = d.getFullYear()
  const month = d
    .toLocaleDateString(locale, { month: 'long' })
    .toLocaleUpperCase(locale)

  return `${month} ${year}`
}
