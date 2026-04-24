'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { getRandomQuote, type MotivationalQuote } from '@/lib/motivational-quotes'

export function MotivationalQuoteBlock() {
  const locale = useLocale() as 'de' | 'ru' | 'en' | 'tr'
  const [quote, setQuote] = useState<MotivationalQuote | null>(null)

  // Render the quote only after client mount to avoid hydration mismatch
  // (Math.random would produce different values on server and client).
  useEffect(() => {
    setQuote(getRandomQuote())
  }, [])

  if (!quote) {
    return <div className="h-14 max-w-xl" aria-hidden="true" />
  }

  const translation = locale !== 'de' ? quote[locale] : null

  return (
    <div data-testid="motivational-quote-block" className="max-w-xl">
      <p className="font-display text-lg italic leading-snug text-ink">
        {quote.de}
      </p>
      {translation && (
        <p className="mt-1 text-sm text-muted">
          {translation}
          {quote.author && (
            <span className="ml-1 text-ink-soft">— {quote.author}</span>
          )}
        </p>
      )}
      {!translation && quote.author && (
        <p className="mt-1 text-sm text-muted">— {quote.author}</p>
      )}
    </div>
  )
}
