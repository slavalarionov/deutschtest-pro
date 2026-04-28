import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { AuthNav } from '@/components/auth/AuthNav'
import { Footer } from '@/components/landing/Footer'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { createClient } from '@/lib/supabase/server'

const TERMS_FILES: Record<string, string> = {
  ru: 'terms.ru.md',
  de: 'agb.de.md',
  en: 'terms.en.md',
  tr: 'terms.tr.md',
}

const TITLES: Record<string, string> = {
  ru: 'Условия использования',
  de: 'AGB',
  en: 'Terms of Service',
  tr: 'Kullanım Şartları',
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const title = TITLES[locale] ?? TITLES.de
  return { title: `${title} — DeutschTest.pro` }
}

export default async function TermsPage() {
  const locale = await getLocale()
  const filename = TERMS_FILES[locale] ?? TERMS_FILES.de

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-screen bg-page">
      <header className="absolute right-4 top-4 z-50 sm:right-8 sm:top-6">
        <AuthNav userEmail={user?.email ?? null} />
      </header>
      <LegalDocument filename={filename} />
      <Footer />
    </main>
  )
}
