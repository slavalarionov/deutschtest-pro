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

  const messages = (await import(`../messages/${locale}.json`)).default
  const fallbackMessages =
    locale === defaultLocale
      ? messages
      : (await import(`../messages/${defaultLocale}.json`)).default

  return {
    locale,
    messages: { ...fallbackMessages, ...messages },
    onError: () => {
      // Временно для Этапа 2a: словари RU/EN/TR пустые. Тихо падаем обратно на DE.
    },
    getMessageFallback: ({ key }) => key,
  }
})
