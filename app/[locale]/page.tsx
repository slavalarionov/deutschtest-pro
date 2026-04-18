import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { HeroSection } from '@/components/landing/HeroSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { PricingSection } from '@/components/landing/PricingSection'
import { FaqSection } from '@/components/landing/FaqSection'
import { AuthNav } from '@/components/auth/AuthNav'
import { createClient } from '@/lib/supabase/server'
import { checkUserCanTakeTest } from '@/lib/exam/limits'

export async function generateMetadata({
  params,
}: {
  params: { locale: string }
}): Promise<Metadata> {
  const t = await getTranslations({ locale: params.locale, namespace: 'landing.metadata' })
  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let freeTestAvailable = true
  let paidTestsCount = 0
  let modulesBalance = 0
  let isAdmin = false

  if (user) {
    const availability = await checkUserCanTakeTest(user.id, user.email)
    freeTestAvailable = availability.freeTestAvailable
    paidTestsCount = availability.paidTestsCount
    modulesBalance = availability.modulesBalance
    isAdmin = !!availability.isAdmin
  }

  return (
    <main className="min-h-screen">
      <header className="absolute right-4 top-4 z-50 sm:right-8 sm:top-6">
        <AuthNav userEmail={user?.email ?? null} />
      </header>
      <HeroSection
        isLoggedIn={!!user}
        freeTestAvailable={freeTestAvailable}
        paidTestsCount={paidTestsCount}
        modulesBalance={modulesBalance}
        isAdmin={isAdmin}
      />
      <FeaturesSection />
      <PricingSection />
      <FaqSection />
    </main>
  )
}
