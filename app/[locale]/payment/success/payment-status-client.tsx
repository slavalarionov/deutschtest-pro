'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

type Phase = 'pending' | 'approved' | 'failed' | 'expired' | 'timeout' | 'unknown'

interface StatusResponse {
  status: 'pending' | 'approved' | 'failed' | 'refunded' | 'expired'
  modulesCredited: number | null
  amountMinor: number
  currency: 'RUB' | 'EUR'
  paymentMethod: string | null
}

const POLL_INTERVAL_MS = 2_000
const POLL_TIMEOUT_MS = 30_000

/**
 * Props are deliberately kept to plain serializable types only — orderId
 * (string), the two initial-state primitives, and the two precomputed
 * hrefs. All visible strings come from `useTranslations` inside this
 * client bundle. The previous shape passed `labels.approved` as a function
 * forwarded from the server, which RSC cannot serialize and which broke
 * SSR with a 500 in production (same architectural mistake as hotfix-1
 * for CheckoutButton, commit ae93d2c).
 */
export interface PaymentStatusClientProps {
  orderId: string
  initialStatus: StatusResponse['status']
  initialModulesCredited: number | null
  dashboardHref: string
  pricingHref: string
}

export function PaymentStatusClient(props: PaymentStatusClientProps) {
  const t = useTranslations('payment.success')

  const [phase, setPhase] = useState<Phase>(mapInitial(props.initialStatus))
  const [modulesCredited, setModulesCredited] = useState<number | null>(
    props.initialModulesCredited,
  )
  const startedAtRef = useRef(Date.now())

  useEffect(() => {
    if (phase !== 'pending') return
    let cancelled = false

    const tick = async () => {
      if (cancelled) return
      try {
        const res = await fetch(
          `/api/payments/${encodeURIComponent(props.orderId)}/status`,
          { cache: 'no-store' },
        )
        if (cancelled) return
        if (!res.ok) {
          setPhase('unknown')
          return
        }
        const data = (await res.json()) as StatusResponse
        if (data.status === 'approved') {
          setModulesCredited(data.modulesCredited)
          setPhase('approved')
          return
        }
        if (data.status === 'failed') {
          setPhase('failed')
          return
        }
        if (data.status === 'expired') {
          setPhase('expired')
          return
        }
      } catch {
        // network glitch — keep polling
      }
      if (Date.now() - startedAtRef.current >= POLL_TIMEOUT_MS) {
        setPhase('timeout')
      }
    }

    const id = setInterval(tick, POLL_INTERVAL_MS)
    void tick()
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [phase, props.orderId])

  if (phase === 'approved') {
    const credits = modulesCredited ?? 0
    return (
      <CardOk
        title={t('approved', { count: credits })}
        cta={t('toDashboard')}
        href={props.dashboardHref}
      />
    )
  }
  if (phase === 'failed') {
    return (
      <CardErr
        title={t('failed')}
        cta={t('tryAgain')}
        href={props.pricingHref}
      />
    )
  }
  if (phase === 'expired') {
    return (
      <CardErr
        title={t('expired')}
        cta={t('tryAgain')}
        href={props.pricingHref}
      />
    )
  }
  if (phase === 'timeout' || phase === 'unknown') {
    return (
      <CardWait
        title={t('timeoutFallback')}
        cta={t('toDashboard')}
        href={props.dashboardHref}
      />
    )
  }
  return <CardWait title={t('pending')} />
}

function mapInitial(s: StatusResponse['status']): Phase {
  if (s === 'approved') return 'approved'
  if (s === 'failed') return 'failed'
  if (s === 'expired') return 'expired'
  return 'pending'
}

function CardOk({
  title,
  cta,
  href,
}: {
  title: string
  cta: string
  href: string
}) {
  return (
    <div className="rounded-rad border border-accent/40 bg-accent-soft p-8 text-center">
      <p className="font-mono text-[11px] uppercase tracking-widest text-accent-ink">
        OK
      </p>
      <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">
        {title}
      </h1>
      <a
        href={href}
        className="mt-6 inline-flex items-center gap-2 rounded-rad-pill bg-ink px-6 py-3 text-sm font-medium text-card transition-opacity hover:opacity-90"
      >
        {cta}
      </a>
    </div>
  )
}

function CardWait({
  title,
  cta,
  href,
}: {
  title: string
  cta?: string
  href?: string
}) {
  return (
    <div className="rounded-rad border border-line bg-card p-8 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-line border-t-ink" />
      <p className="mt-4 text-ink-soft">{title}</p>
      {cta && href && (
        <a
          href={href}
          className="mt-6 inline-flex items-center gap-2 rounded-rad-pill border border-line bg-card px-5 py-2.5 text-sm text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          {cta}
        </a>
      )}
    </div>
  )
}

function CardErr({
  title,
  cta,
  href,
}: {
  title: string
  cta: string
  href: string
}) {
  return (
    <div className="rounded-rad border border-error/40 bg-card p-8 text-center">
      <p className="font-mono text-[11px] uppercase tracking-widest text-error">
        Ошибка
      </p>
      <h1 className="mt-4 font-display text-4xl tracking-tight text-ink">
        {title}
      </h1>
      <a
        href={href}
        className="mt-6 inline-flex items-center gap-2 rounded-rad-pill bg-ink px-6 py-3 text-sm font-medium text-card transition-opacity hover:opacity-90"
      >
        {cta}
      </a>
    </div>
  )
}
