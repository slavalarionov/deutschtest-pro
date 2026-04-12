-- Миграция 008: Admin Panel — schemas
-- Часть Шага 1 из Admin Panel Roadmap.
-- Создаёт таблицы для управления промптами, промокодами, аудита начислений и фидбэка.
-- Все таблицы с RLS, без публичных policy — доступ только через service role.

-- ───────────────────────────────────────────────────────────
-- 1. Промпты с версионированием
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.prompts (
  key TEXT PRIMARY KEY,             -- 'generation/lesen-teil1', 'scoring/schreiben' и т.д.
  category TEXT NOT NULL,           -- 'generation' | 'scoring'
  active_version_id BIGINT,         -- FK на prompt_versions.id, заполняется после первого insert версии
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prompt_versions (
  id BIGSERIAL PRIMARY KEY,
  prompt_key TEXT NOT NULL REFERENCES public.prompts(key) ON DELETE CASCADE,
  version INT NOT NULL,
  content TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(prompt_key, version)
);

CREATE INDEX IF NOT EXISTS idx_prompt_versions_key
  ON public.prompt_versions(prompt_key, version DESC);

-- FK на active_version_id добавляем отдельно (чтобы избежать циклической зависимости при создании).
-- Обёрнуто в DO-блок для идемпотентности — можно прогнать повторно без ошибки.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_prompts_active_version'
      AND conrelid = 'public.prompts'::regclass
  ) THEN
    ALTER TABLE public.prompts
      ADD CONSTRAINT fk_prompts_active_version
      FOREIGN KEY (active_version_id)
      REFERENCES public.prompt_versions(id)
      ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_versions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.prompts IS 'Промпты с версионированием. Источник правды для генерации и скоринга.';
COMMENT ON TABLE public.prompt_versions IS 'История версий промптов для отката и аудита.';

-- ───────────────────────────────────────────────────────────
-- 2. Промокоды на начисление модулей
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  modules_reward INT NOT NULL CHECK (modules_reward > 0),
  max_redemptions INT,              -- NULL = без лимита активаций
  current_redemptions INT DEFAULT 0,
  valid_until TIMESTAMPTZ,          -- NULL = бессрочный
  one_per_user BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_active
  ON public.promo_codes(is_active) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id BIGSERIAL PRIMARY KEY,
  promo_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modules_granted INT NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(promo_id, user_id)         -- защита от повторного использования одним юзером
);

CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user
  ON public.promo_redemptions(user_id);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.promo_codes IS 'Промокоды на бесплатное начисление модулей. Не дают скидки на покупку.';

-- ───────────────────────────────────────────────────────────
-- 3. История начислений и списаний модулей (аудит)
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.modules_ledger (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INT NOT NULL,               -- +N начислено, -N списано
  reason TEXT NOT NULL,             -- 'free_signup' | 'admin_grant' | 'promo:CODE' | 'purchase' | 'spent_on_module'
  related_attempt_id UUID REFERENCES public.user_attempts(id) ON DELETE SET NULL,
  related_promo_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL для системных операций
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modules_ledger_user
  ON public.modules_ledger(user_id, created_at DESC);

ALTER TABLE public.modules_ledger ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.modules_ledger IS 'Аудит всех начислений и списаний modules_balance. Источник истины для истории операций пользователя.';

-- ───────────────────────────────────────────────────────────
-- 4. Фидбэк от пользователей
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attempt_id UUID REFERENCES public.user_attempts(id) ON DELETE SET NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created
  ON public.feedback(created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.feedback IS 'Опциональная форма отзыва после прохождения теста. Замена идее хранить транскрипты ответов.';

-- ───────────────────────────────────────────────────────────
-- 5. Новые поля в profiles: безлимит и блокировка
-- ───────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.is_unlimited IS 'Безлимитный доступ — игнорирует modules_balance. Только админ может назначать.';
COMMENT ON COLUMN public.profiles.is_blocked IS 'Блокировка пользователя. Заблокированные не могут начинать новые тесты.';
