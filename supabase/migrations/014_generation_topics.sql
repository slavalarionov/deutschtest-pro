-- Миграция 014: generation_topics — тематический sampler для генерации.
-- Часть Шага 3 Admin Panel Roadmap (Prompts + Topics).
-- Решает проблему «Claude выдаёт одинаковые тесты»: при каждой генерации
-- случайно выбирается одна активная тема и подставляется в промпт.
-- Редактируется через /admin/topics.

CREATE TABLE IF NOT EXISTS public.generation_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL CHECK (module IN ('lesen', 'horen', 'schreiben', 'sprechen')),
  level TEXT NOT NULL CHECK (level IN ('a1', 'a2', 'b1')),
  teil INTEGER,                    -- 1..5 для Lesen, 1..4 для Hören, NULL для Schreiben/Sprechen
  topic_data JSONB NOT NULL,       -- {situation, recipient, taskHints, ...} — схема зависит от модуля
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_topics_active
  ON public.generation_topics(module, level, teil)
  WHERE is_active = TRUE;

ALTER TABLE public.generation_topics ENABLE ROW LEVEL SECURITY;

-- Без публичных policy — доступ только через service role из админских роутов
-- и из sampler'а (lib/topic-sampler.ts).

COMMENT ON TABLE public.generation_topics IS
  'Тематические сценарии для генерации. Sampler выбирает случайную активную строку на каждую генерацию модуля.';
COMMENT ON COLUMN public.generation_topics.topic_data IS
  'JSON с полями темы (situation, recipient, taskHints[], examples[] и т.п.). Форма зависит от module+teil.';

NOTIFY pgrst, 'reload schema';
