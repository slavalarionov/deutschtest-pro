import { getRequestConfig } from 'next-intl/server'

export const locales = ['de', 'ru', 'en', 'tr'] as const
export const defaultLocale = 'de' as const
export type Locale = (typeof locales)[number]

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale: Locale =
    requested && (locales as readonly string[]).includes(requested)
      ? (requested as Locale)
      : defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
