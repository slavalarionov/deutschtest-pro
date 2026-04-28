/**
 * Stylised payment-system indicators.
 * NOT real Visa/MasterCard/Mir trademarks — using their official logos
 * without written permission is a trademark violation. Banks accept
 * stylised indicators that "these payment methods are supported".
 */
export function PaymentLogos() {
  return (
    <div className="flex items-center gap-4">
      {/* Visa — wordmark stylised */}
      <div
        aria-label="Visa"
        className="flex h-6 w-12 items-center justify-center rounded-rad-sm border border-line bg-card"
      >
        <span className="font-display text-[11px] font-bold tracking-wider text-ink-soft">
          VISA
        </span>
      </div>

      {/* MasterCard — overlapping circles, brand-suggestive */}
      <div
        aria-label="MasterCard"
        className="flex h-6 w-12 items-center justify-center rounded-rad-sm border border-line bg-card"
      >
        <span className="block h-3.5 w-3.5 rounded-rad-pill bg-[#EB001B] opacity-80" />
        <span className="-ml-1.5 block h-3.5 w-3.5 rounded-rad-pill bg-[#F79E1B] opacity-80 mix-blend-multiply" />
      </div>

      {/* Мир */}
      <div
        aria-label="Мир"
        className="flex h-6 items-center justify-center rounded-rad-sm border border-line bg-card px-2"
      >
        <span className="font-display text-[10px] font-bold tracking-wider text-ink-soft">
          МИР
        </span>
      </div>
    </div>
  )
}
