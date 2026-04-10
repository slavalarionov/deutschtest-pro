import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { checkUserCanTakeTest } from '@/lib/exam/limits'

interface PricingPackage {
  name: string
  price: string
  priceNote: string
  originalPrice?: string
  features: string[]
  highlighted: boolean
  badge?: string
}

const packages: PricingPackage[] = [
  {
    name: '1 Test',
    price: '150',
    priceNote: 'einmalig',
    features: [
      '1 vollständige Prüfung',
      'Alle 4 Module',
      'KI-Bewertung & Feedback',
    ],
    highlighted: false,
  },
  {
    name: '5 Tests',
    price: '599',
    priceNote: 'Sparpaket',
    originalPrice: '750',
    features: [
      '5 vollständige Prüfungen',
      'Alle 4 Module',
      'KI-Bewertung & Feedback',
      'Fortschrittsanalyse',
    ],
    highlighted: true,
    badge: 'Beliebt',
  },
  {
    name: '10 Tests',
    price: '990',
    priceNote: 'Bestes Angebot',
    originalPrice: '1500',
    features: [
      '10 vollständige Prüfungen',
      'Alle 4 Module',
      'KI-Bewertung & Feedback',
      'Fortschrittsanalyse',
      'Prioritäts-Support',
    ],
    highlighted: false,
    badge: '-34%',
  },
]

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let freeTestAvailable = false
  let paidTestsCount = 0

  if (user) {
    const availability = await checkUserCanTakeTest(user.id, user.email)
    freeTestAvailable = availability.freeTestAvailable
    paidTestsCount = availability.paidTestsCount
  }

  return (
    <main className="min-h-screen bg-brand-bg">
      <header className="flex items-center justify-between px-6 py-4 sm:px-10 sm:py-6">
        <Link href="/" className="text-lg font-bold text-brand-text">
          DeutschTest<span className="text-brand-gold">.pro</span>
        </Link>
        {user ? (
          <span className="text-sm text-brand-muted">
            {user.email}
          </span>
        ) : (
          <Link
            href="/login"
            className="rounded-lg border border-brand-border bg-brand-white px-4 py-2 text-sm font-medium text-brand-text shadow-soft transition hover:border-brand-gold/40"
          >
            Anmelden
          </Link>
        )}
      </header>

      <section className="px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 text-center">
            <h1 className="mb-3 text-3xl font-bold text-brand-text sm:text-4xl">
              Tests kaufen
            </h1>
            <p className="mx-auto max-w-xl text-brand-muted">
              Wählen Sie das passende Paket für Ihre Prüfungsvorbereitung.
              Jeder Test enthält alle Module: Lesen, Hören, Schreiben, Sprechen.
            </p>
          </div>

          {user && freeTestAvailable && (
            <div className="mx-auto mb-10 max-w-md rounded-xl border border-green-200 bg-green-50 px-6 py-4 text-center">
              <p className="text-sm font-medium text-green-800">
                Sie haben noch einen <strong>kostenlosen Test</strong> verfügbar!
              </p>
              <Link
                href="/"
                className="mt-2 inline-block text-sm font-semibold text-brand-gold hover:text-brand-gold-dark"
              >
                Jetzt kostenlos testen &rarr;
              </Link>
            </div>
          )}

          {user && !freeTestAvailable && paidTestsCount > 0 && (
            <div className="mx-auto mb-10 max-w-md rounded-xl border border-brand-gold/30 bg-brand-gold/5 px-6 py-4 text-center">
              <p className="text-sm font-medium text-brand-text">
                Sie haben <strong>{paidTestsCount} {paidTestsCount === 1 ? 'Test' : 'Tests'}</strong> verfügbar.
              </p>
              <Link
                href="/"
                className="mt-2 inline-block text-sm font-semibold text-brand-gold hover:text-brand-gold-dark"
              >
                Test starten &rarr;
              </Link>
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-3">
            {packages.map((pkg) => (
              <div
                key={pkg.name}
                className={`relative rounded-xl p-8 transition ${
                  pkg.highlighted
                    ? 'border-2 border-brand-gold bg-brand-white shadow-card'
                    : 'border border-brand-border bg-brand-white shadow-soft'
                }`}
              >
                {pkg.badge && (
                  <span className="absolute -top-3 right-4 rounded-full bg-brand-gold px-3 py-0.5 text-xs font-bold text-white">
                    {pkg.badge}
                  </span>
                )}

                <h3 className="mb-1 text-lg font-semibold text-brand-text">
                  {pkg.name}
                </h3>

                <div className="mb-1">
                  {pkg.originalPrice && (
                    <span className="mr-2 text-sm text-brand-muted line-through">
                      {pkg.originalPrice} &#8381;
                    </span>
                  )}
                  <span className="text-3xl font-bold text-brand-text">
                    {pkg.price}
                  </span>
                  <span className="ml-1 text-sm text-brand-muted">&#8381;</span>
                </div>

                <p className="mb-6 text-xs text-brand-muted">{pkg.priceNote}</p>

                <ul className="mb-8 space-y-2">
                  {pkg.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-brand-text"
                    >
                      <span className="mt-0.5 text-brand-gold">&#10003;</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  disabled
                  className={`w-full rounded-lg py-2.5 text-sm font-medium transition ${
                    pkg.highlighted
                      ? 'bg-brand-gold text-white hover:bg-brand-gold-dark disabled:opacity-80'
                      : 'border border-brand-border bg-brand-bg text-brand-text hover:bg-brand-surface disabled:opacity-80'
                  }`}
                >
                  Kaufen (bald verfügbar)
                </button>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-brand-muted">
            Sichere Bezahlung. Alle Preise inkl. MwSt. Tests sind 30 Tage gültig.
          </p>
        </div>
      </section>
    </main>
  )
}
