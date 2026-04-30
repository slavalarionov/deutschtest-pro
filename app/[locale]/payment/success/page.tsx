import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import type { Locale } from '@/i18n/request'
import { PaymentStatusClient } from './payment-status-client'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: { locale: Locale }
  searchParams: { orderId?: string }
}

export default async function PaymentSuccessPage({
  params,
  searchParams,
}: PageProps) {
  const orderId = (searchParams.orderId ?? '').trim()
  if (!orderId) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(
      `/${params.locale === 'de' ? '' : `${params.locale}/`}login?next=${encodeURIComponent(
        `/${params.locale}/payment/success?orderId=${orderId}`,
      )}`,
    )
  }

  const { data: row } = await supabase
    .from('payments')
    .select('status, package_size, promo_bonus_modules')
    .eq('order_id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!row) notFound()

  const t = await getTranslations({
    locale: params.locale,
    namespace: 'payment.success',
  })

  const initialModules =
    row.status === 'approved'
      ? (row.package_size ?? 0) + (row.promo_bonus_modules ?? 0)
      : null

  const dashboardHref =
    params.locale === 'de' ? '/dashboard' : `/${params.locale}/dashboard`
  const pricingHref =
    params.locale === 'de' ? '/pricing' : `/${params.locale}/pricing`

  // Eyebrow is the only string the server renders; everything else is
  // resolved inside <PaymentStatusClient/> via useTranslations to keep
  // the props strictly serializable.
  return (
    <main className="min-h-screen bg-page">
      <section className="mx-auto max-w-xl px-4 py-24">
        <p className="eyebrow text-center">{t('eyebrow')}</p>
        <div className="mt-6">
          <PaymentStatusClient
            orderId={orderId}
            initialStatus={row.status}
            initialModulesCredited={initialModules}
            dashboardHref={dashboardHref}
            pricingHref={pricingHref}
          />
        </div>
      </section>
    </main>
  )
}
