-- 018_profiles_preferred_language.sql
-- Добавляет поле preferred_language в profiles для i18n.
-- Дефолт 'de' для всех существующих пользователей — они регистрировались
-- на немецком интерфейсе, это корректное предположение.

ALTER TABLE public.profiles
  ADD COLUMN preferred_language TEXT NOT NULL DEFAULT 'de'
  CHECK (preferred_language IN ('de', 'ru', 'en', 'tr'));

COMMENT ON COLUMN public.profiles.preferred_language IS
  'UI language preference. Set at registration from cookie NEXT_LOCALE or form field. Values: de (default), ru, en, tr.';

-- Обновляем триггер handle_new_user, чтобы читать preferred_language
-- из raw_user_meta_data (туда кладёт /api/auth/register).
-- Сохраняем всю существующую логику из миграции 017:
--   - ON CONFLICT (id) DO NOTHING для защиты от дубликатов,
--   - запись в modules_ledger только если профиль реально создан (IF FOUND),
--   - reason='free_signup' и note='Welcome bonus on registration'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preferred_language TEXT;
BEGIN
  v_preferred_language := COALESCE(
    NEW.raw_user_meta_data->>'preferred_language',
    'de'
  );

  IF v_preferred_language NOT IN ('de', 'ru', 'en', 'tr') THEN
    v_preferred_language := 'de';
  END IF;

  INSERT INTO public.profiles (id, email, modules_balance, preferred_language)
  VALUES (NEW.id, NEW.email, 3, v_preferred_language)
  ON CONFLICT (id) DO NOTHING;

  IF FOUND THEN
    INSERT INTO public.modules_ledger (user_id, delta, reason, note)
    VALUES (NEW.id, 3, 'free_signup', 'Welcome bonus on registration');
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
