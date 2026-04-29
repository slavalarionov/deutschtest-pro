'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { Locale } from '@/i18n/request'
import type { PackageId } from '@/lib/pricing'

type Status = 'idle' | 'submitting' | 'redirecting' | 'error'

interface PromoState {
  status: 'idle' | 'checking' | 'valid' | 'invalid'
  discountPercent?: number
  bonusModules?: number
  finalAmountMinor?: number
  errorCode?: string
}

export interface CheckoutButtonProps {
  packageId: PackageId
  locale: Locale
  featured: boolean
  enabled: boolean
  disabledLabel: string
  buyLabel: string
  redirectingLabel: string
  promoToggleLabel: string
  promoPlaceholder: string
  promoCheckingLabel: string
  promoAppliedLabel: (discount: number, bonus: number) => string
  promoErrorLabels: Record<string, string>
  fallbackErrorLabel: string
}

/**
 * Client component that handles the actual checkout call from /pricing.
 * Receives all visible strings as props so the server-side PricingSection
 * keeps full control over translations — there is no `useTranslations`
 * hook inside this client bundle.
 */
export function CheckoutButton(props: CheckoutButtonProps) {
  if (!props.enabled) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className={[
          'mt-0 inline-flex w-full items-center justify-center gap-2 rounded-rad-pill px-6 py-3 text-sm font-medium transition-opacity',
          'cursor-not-allowed opacity-60',
          props.featured ? 'bg-card text-ink' : 'bg-ink text-card',
        ].join(' ')}
      >
        {props.disabledLabel}
      </button>
    )
  }

  return <ActiveCheckout {...props} />
}

function ActiveCheckout(props: CheckoutButtonProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showPromo, setShowPromo] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promo, setPromo] = useState<PromoState>({ status: 'idle' })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const validatePromo = useCallback(
    async (code: string) => {
      if (!code.trim()) {
        setPromo({ status: 'idle' })
        return
      }
      setPromo({ status: 'checking' })
      try {
        const res = await fetch('/api/promo/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: code.trim().toUpperCase(),
            packageId: props.packageId,
            locale: props.locale,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          valid?: boolean
          errorCode?: string
          discountPercent?: number
          bonusModules?: number
          finalAmountMinor?: number
        }
        if (res.ok && data.valid) {
          setPromo({
            status: 'valid',
            discountPercent: data.discountPercent,
            bonusModules: data.bonusModules,
            finalAmountMinor: data.finalAmountMinor,
          })
        } else {
          setPromo({
            status: 'invalid',
            errorCode: data.errorCode ?? 'unknown',
          })
        }
      } catch {
        setPromo({ status: 'invalid', errorCode: 'network' })
      }
    },
    [props.packageId, props.locale],
  )

  useEffect(() => {
    if (!showPromo) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => validatePromo(promoCode), 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [promoCode, showPromo, validatePromo])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: props.packageId,
          promoCode:
            promo.status === 'valid' && promoCode.trim()
              ? promoCode.trim().toUpperCase()
              : undefined,
          locale: props.locale,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        paymentUrl?: string
        code?: string
        error?: string
      }
      if (!res.ok || !data.paymentUrl) {
        if (res.status === 401) {
          setStatus('error')
          setErrorMsg(
            props.promoErrorLabels.unauthorized ?? props.fallbackErrorLabel,
          )
          return
        }
        setStatus('error')
        setErrorMsg(props.fallbackErrorLabel)
        return
      }
      setStatus('redirecting')
      window.location.assign(data.paymentUrl)
    } catch {
      setStatus('error')
      setErrorMsg(props.fallbackErrorLabel)
    }
  }

  const promoLine =
    promo.status === 'checking'
      ? props.promoCheckingLabel
      : promo.status === 'valid'
        ? props.promoAppliedLabel(
            promo.discountPercent ?? 0,
            promo.bonusModules ?? 0,
          )
        : promo.status === 'invalid'
          ? (props.promoErrorLabels[promo.errorCode ?? 'unknown'] ??
            props.fallbackErrorLabel)
          : null

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <button
        type="submit"
        disabled={status === 'submitting' || status === 'redirecting'}
        className={[
          'inline-flex w-full items-center justify-center gap-2 rounded-rad-pill px-6 py-3 text-sm font-medium transition-opacity',
          'disabled:cursor-not-allowed disabled:opacity-60',
          props.featured ? 'bg-card text-ink' : 'bg-ink text-card',
        ].join(' ')}
      >
        {status === 'submitting' || status === 'redirecting'
          ? props.redirectingLabel
          : props.buyLabel}
        {status === 'idle' && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 10h10M11 6l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {!showPromo ? (
        <button
          type="button"
          onClick={() => setShowPromo(true)}
          className={[
            'block w-full text-center font-mono text-[11px] uppercase tracking-wide underline-offset-2 hover:underline',
            props.featured ? 'text-card/70' : 'text-ink-soft',
          ].join(' ')}
        >
          {props.promoToggleLabel}
        </button>
      ) : (
        <div>
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            spellCheck={false}
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            placeholder={props.promoPlaceholder}
            maxLength={32}
            className={[
              'block w-full rounded-rad border px-4 py-2 font-mono text-sm tracking-wider',
              props.featured
                ? 'border-card/30 bg-card/10 text-card placeholder:text-card/40 focus:border-card focus:outline-none'
                : 'border-line bg-card text-ink placeholder:text-muted focus:border-ink focus:outline-none',
            ].join(' ')}
          />
          {promoLine && (
            <p
              className={[
                'mt-2 font-mono text-[11px]',
                promo.status === 'valid'
                  ? 'text-accent-ink'
                  : promo.status === 'invalid'
                    ? 'text-error'
                    : props.featured
                      ? 'text-card/60'
                      : 'text-muted',
              ].join(' ')}
            >
              {promoLine}
            </p>
          )}
        </div>
      )}

      {errorMsg && (
        <p className="text-center font-mono text-[11px] text-error">
          {errorMsg}
        </p>
      )}
    </form>
  )
}
