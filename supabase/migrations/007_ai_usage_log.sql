-- Миграция 007: AI usage logging
-- Логирование всех вызовов внешних AI-провайдеров для подсчёта расходов.
-- Часть подготовки к админ-панели (шаг 0 из плана Admin Panel Roadmap).

CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.exam_sessions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,           -- 'anthropic' | 'elevenlabs' | 'openai'
  model TEXT NOT NULL,              -- 'claude-sonnet-4-6' | 'eleven_multilingual_v2' | 'whisper-1'
  operation TEXT NOT NULL,          -- 'generate_lesen_teil1' | 'tts_horen' | 'transcribe_sprechen' и т.д.
  input_tokens INT,
  output_tokens INT,
  audio_seconds NUMERIC,
  characters INT,
  cost_usd NUMERIC(10,6) NOT NULL,
  metadata JSONB,                   -- произвольные доп. поля (level, teil и т.д.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_created
  ON public.ai_usage_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user
  ON public.ai_usage_log(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_provider
  ON public.ai_usage_log(provider, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_usage_session
  ON public.ai_usage_log(session_id);

-- RLS: только service_role имеет доступ. Никаких публичных policy.
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ai_usage_log IS
  'Лог всех вызовов внешних AI (Anthropic, ElevenLabs, OpenAI) для подсчёта расходов. Только метаданные, никогда не пишет содержимое промптов или ответов.';
