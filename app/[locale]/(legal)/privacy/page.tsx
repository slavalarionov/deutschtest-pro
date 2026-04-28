import type { Metadata } from 'next'
import { getLocale } from 'next-intl/server'
import { AuthNav } from '@/components/auth/AuthNav'
import { Footer } from '@/components/landing/Footer'
import { LegalDocument } from '@/components/legal/LegalDocument'
import { createClient } from '@/lib/supabase/server'

const PRIVACY_FILES: Record<string, string> = {
  ru: 'privacy.ru.md',
  de: 'datenschutz.de.md',
  en: 'privacy.en.md',
  tr: 'privacy.tr.md',
}

const TITLES: Record<string, string> = {
  ru: 'Политика конфиденциальности',
  de: 'Datenschutzerklärung',
  en: 'Privacy Policy',
  tr: 'Gizlilik Politikası',
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const title = TITLES[locale] ?? TITLES.de
  return { title: `${title} — DeutschTest.pro` }
}

export default async function PrivacyPage() {
  const locale = await getLocale()
  const filename = PRIVACY_FILES[locale] ?? PRIVACY_FILES.de

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
