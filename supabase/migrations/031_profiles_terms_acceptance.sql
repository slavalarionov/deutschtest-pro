-- 031_profiles_terms_acceptance.sql
-- Юридически фиксируем факт согласия пользователя с Terms/AGB и Privacy на момент
-- регистрации — необходимо для подтверждения acceptance в случае претензий.
--
-- 1. Добавляем два поля в profiles.
-- 2. Расширяем триггер handle_new_user (поверх версии из 023): читаем
--    terms_accepted_at и terms_version из raw_user_meta_data, которые кладёт
--    /api/auth/register. Если их нет (например, регистрация через Google OAuth
--    до выкатки чекбокса) — фолбэк на NOW() и текущую версию документов.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_accepted_version TEXT;

COMMENT ON COLUMN public.profiles.terms_accepted_at IS
  'Время принятия Terms/AGB и Privacy при регистрации';
COMMENT ON COLUMN public.profiles.terms_accepted_version IS
  'Версия документов на момент принятия (для будущих ре-акцептов при изменениях)';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preferred_language TEXT;
  v_display_name TEXT;
  v_terms_accepted_at TIMESTAMPTZ;
  v_terms_version TEXT;
BEGIN
  v_preferred_language := COALESCE(
    NEW.raw_user_meta_data->>'preferred_language',
    'de'
  );

  IF v_preferred_language NOT IN ('de', 'ru', 'en', 'tr') THEN
    v_preferred_language := 'de';
  END IF;

  v_display_name := NULLIF(
    TRIM(COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name'
    )),
    ''
  );

  v_terms_accepted_at := COALESCE(
    (NEW.raw_user_meta_data->>'terms_accepted_at')::TIMESTAMPTZ,
    NOW()
  );
  v_terms_version := COALESCE(
    NEW.raw_user_meta_data->>'terms_version',
    '2026-04-28'
  );

  INSERT INTO public.profiles (
    id, email, modules_balance, preferred_language, display_name,
    terms_accepted_at, terms_accepted_version
  )
  VALUES (
    NEW.id, NEW.email, 3, v_preferred_language, v_display_name,
    v_terms_accepted_at, v_terms_version
  )
  ON CONFLICT (id) DO NOTHING;

  IF FOUND THEN
    INSERT INTO public.modules_ledger (user_id, delta, reason, note)
    VALUES (NEW.id, 3, 'free_signup', 'Welcome bonus on registration');
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
