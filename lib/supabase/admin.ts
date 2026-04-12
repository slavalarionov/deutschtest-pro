/**
 * Supabase клиент с service_role ключом.
 *
 * ВНИМАНИЕ — БЕЗОПАСНОСТЬ:
 * Этот клиент обходит RLS и имеет полный доступ к БД. Использовать ТОЛЬКО в:
 * - server components страниц /admin/*
 * - API routes /api/admin/*
 * - утилитах логирования (lib/ai-usage-logger.ts уже использует похожий подход)
 *
 * НИКОГДА не импортировать из:
 * - клиентских компонентов ('use client')
 * - публичных API routes (не /admin/*)
 * - middleware
 *
 * Все админские API routes должны дополнительно проверять requireAdminApi()
 * перед использованием этого клиента — это защита на случай, если кто-то по
 * ошибке создаст роут не в /admin/* и забудет про auth.
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

let cachedClient: SupabaseClient | null = null

export function createAdminClient(): SupabaseClient {
  // Кешируем клиент на уровне модуля — нет смысла создавать новый на каждый вызов.
  if (cachedClient) return cachedClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      '[admin client] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars'
    )
  }

  cachedClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cachedClient
}
