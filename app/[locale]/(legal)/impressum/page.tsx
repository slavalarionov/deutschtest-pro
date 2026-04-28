import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { AuthNav } from '@/components/auth/AuthNav'
import { Footer } from '@/components/landing/Footer'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  if (locale !== 'de') return {}
  return { title: 'Impressum — DeutschTest.pro' }
}

export default async function ImpressumPage() {
  const locale = await getLocale()
  if (locale !== 'de') notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-page">
      <header className="absolute right-4 top-4 z-50 sm:right-8 sm:top-6">
        <AuthNav userEmail={user?.email ?? null} />
      </header>
      <LegalDocument filename="impressum.de.md" />
      <Footer />
    </main>
  )
}
