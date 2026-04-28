/**
 * Stylised payment-system indicators.
 * Monochrome editorial tone — no real Visa/MasterCard/Mir trademarks.
 */
export function PaymentLogos() {
  return (
    <div className="flex items-center gap-4 text-muted">
      <span
        aria-label="Visa"
        className="font-mono text-xs font-bold uppercase tracking-wider"
      >
        VISA
      </span>

      <span aria-hidden="true" className="text-muted/40">
        ·
      </span>

      <span aria-label="MasterCard" className="flex items-center">
        <span className="block h-3 w-3 rounded-rad-pill border border-current" />
        <span className="-ml-1.5 block h-3 w-3 rounded-rad-pill border border-current" />
      </span>

      <span aria-hidden="true" className="text-muted/40">
        ·
      </span>

      <span
        aria-label="Мир"
        className="font-mono text-xs font-bold uppercase tracking-wider"
      >
        МИР
      </span>
    </div>
  )
}
