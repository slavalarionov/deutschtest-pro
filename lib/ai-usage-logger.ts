/**
 * Утилита для записи строки в таблицу ai_usage_log.
 *
 * ПРАВИЛА БЕЗОПАСНОСТИ:
 * 1. НИКОГДА не пишет содержимое промптов или ответов AI — только метаданные.
 * 2. Использует service role key — работает только в server-side коде.
 * 3. Все ошибки логирования НЕ должны прерывать основной запрос:
 *    если запись в лог упала, мы просто пишем warning в console и продолжаем.
 *    Логирование — вспомогательный процесс, оно не должно ломать работу пользователя.
 */

import { createClient } from '@supabase/supabase-js';

type Provider = 'anthropic' | 'elevenlabs' | 'openai';

export interface LogAiUsageParams {
  userId?: string | null;
  sessionId?: string | null;
  provider: Provider;
  model: string;
  operation: string;
  inputTokens?: number;
  outputTokens?: number;
  audioSeconds?: number;
  characters?: number;
  costUsd: number;
  metadata?: Record<string, unknown>;
}

/**
 * Записывает строку в ai_usage_log. Не бросает исключения наружу.
 */
export async function logAiUsage(params: LogAiUsageParams): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('[ai-usage-logger] Missing Supabase env vars, skipping log');
      return;
    }

    // Создаём клиент с service role — обходит RLS.
    // НЕ используем shared client, чтобы изолировать service role от обычных запросов.
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error } = await supabase.from('ai_usage_log').insert({
      user_id: params.userId ?? null,
      session_id: params.sessionId ?? null,
      provider: params.provider,
      model: params.model,
      operation: params.operation,
      input_tokens: params.inputTokens ?? null,
      output_tokens: params.outputTokens ?? null,
      audio_seconds: params.audioSeconds ?? null,
      characters: params.characters ?? null,
      cost_usd: params.costUsd,
      metadata: params.metadata ?? null,
    });

    if (error) {
      console.warn('[ai-usage-logger] Failed to insert log row:', error.message);
    }
  } catch (err) {
    // Никогда не пробрасываем ошибку наружу — логирование не должно ломать основной запрос.
    console.warn('[ai-usage-logger] Unexpected error:', err);
  }
}
