import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { HeroSection } from '@/components/landing/HeroSection'
import { FeaturesSection } from '@/components/landing/FeaturesSection'
import { PricingSection } from '@/components/landing/PricingSection'
import { ManifestoSection } from '@/components/landing/ManifestoSection'
import { ModulesDetailSection } from '@/components/landing/ModulesDetailSection'
import { ProgressSection } from '@/components/landing/ProgressSection'
import { RecommendationsSection } from '@/components/landing/RecommendationsSection'
import { FaqSection } from '@/components/landing/FaqSection'
import { Footer } from '@/components/landing/Footer'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { createClient } from '@/lib/supabase/server'

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

export default async function HomePage(_: { params: { locale: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoggedIn = !!user

  return (
    <main className="min-h-screen">
      <LandingHeader userEmail={user?.email ?? null} />
      <HeroSection isLoggedIn={isLoggedIn} />
      <FeaturesSection />
      <PricingSection />
      <ManifestoSection />
      <ModulesDetailSection />
      <ProgressSection />
      <RecommendationsSection />
      <FaqSection />
      <Footer />
    </main>
  )
}
