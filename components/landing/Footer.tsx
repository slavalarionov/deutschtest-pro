'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { PaymentLogos } from './PaymentLogos'

export function Footer() {
  const t = useTranslations('footer')
  const locale = useLocale()

  return (
    <footer className="border-t border-line bg-page">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-24">
        {/* Top: graphic + columns */}
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_auto]">
          {/* Decorative grapheme — desktop only */}
          <div
            aria-hidden="true"
            className="hidden lg:flex lg:items-start"
          >
            <span className="select-none font-display text-[200px] leading-none text-ink">
              ß
            </span>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-12 md:grid-cols-3 lg:gap-20">
            <div>
              <h3 className="mb-6 font-mono text-xs uppercase tracking-wider text-muted">
                {t('columns.product')}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/#features"
                    className="text-ink-soft transition-colors hover:text-ink"
                  >
                    {t('links.modules')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#features"
                    className="text-ink-soft transition-colors hover:text-ink"
                  >
                    {t('links.levels')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="text-ink-soft transition-colors hover:text-ink"
                  >
                    {t('links.pricing')}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-6 font-mono text-xs uppercase tracking-wider text-muted">
                {t('columns.account')}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/login"
                    className="text-ink-soft transition-colors hover:text-ink"
                  >
                    {t('links.login')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register"
                    className="text-ink-soft transition-colors hover:text-ink"
                  >
                    {t('links.register')}
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:hallo@deutschtest.pro"
                    className="text-ink-soft transition-colors hover:text-ink"
                  >
                    {t('links.contact')}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-6 font-mono text-xs uppercase tracking-wider text-muted">
                {t('columns.legal')}
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    href="/terms"
                    className="text-ink-soft transition-colors hover:text-ink"
                  >
                    {t('links.terms')}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/privacy"
                    className="text-ink-soft transition-colors hover:text-ink"
                  >
                    {t('links.privacy')}
                  </Link>
                </li>
                {locale === 'de' && (
                  <li>
                    <Link
                      href="/impressum"
                      className="text-ink-soft transition-colors hover:text-ink"
                    >
                      {t('links.impressum')}
                    </Link>
                  </li>
                )}
                {locale === 'ru' && (
                  <li>
                    <Link
                      href="/offer"
                      className="text-ink-soft transition-colors hover:text-ink"
                    >
                      {t('links.offer')}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom: brand + requisites + payments */}
        <div className="mt-16 border-t border-line pt-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-rad-pill bg-ink font-display text-sm text-card"
              >
                ß
              </span>
              <span className="font-mono text-sm text-muted">
                deutschtest.pro
              </span>
            </div>

            <div className="font-mono text-xs leading-relaxed text-muted lg:text-right">
              <p>© {new Date().getFullYear()} deutschtest.pro</p>
              <p>{t('legalNotice')}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-6">
            <span className="font-mono text-xs uppercase tracking-wider text-muted">
              {t('paymentMethods')}
            </span>
            <PaymentLogos />
          </div>
        </div>
      </div>
    </footer>
  )
}
