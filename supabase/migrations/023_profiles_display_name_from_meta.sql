-- 023_profiles_display_name_from_meta.sql
-- Расширяет триггер handle_new_user, чтобы при создании профиля заполнять
-- display_name из raw_user_meta_data. Покрывает оба флоу регистрации:
--   • email-register (/api/auth/register) — кладёт имя пользователя в options.data.name
--   • Google OAuth — Supabase сам пишет raw_user_meta_data.{name, full_name} из Google-профиля
--
-- Вся существующая логика из миграций 017 и 018 сохранена без изменений:
--   • modules_balance = 3 по умолчанию,
--   • ON CONFLICT (id) DO NOTHING — защита от дублирующей вставки,
--   • IF FOUND → запись в modules_ledger (reason='free_signup'),
--   • preferred_language с валидацией белого списка и дефолтом 'de'.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preferred_language TEXT;
  v_display_name TEXT;
BEGIN
  v_preferred_language := COALESCE(
    NEW.raw_user_meta_data->>'preferred_language',
    'de'
  );

  IF v_preferred_language NOT IN ('de', 'ru', 'en', 'tr') THEN
    v_preferred_language := 'de';
  END IF;

  -- Берём name (из нашего email-флоу) или full_name (Google OAuth).
  -- NULLIF(TRIM(...), '') — нормализуем пустую строку в NULL,
  -- чтобы не писать в display_name строку из пробелов.
  v_display_name := NULLIF(
    TRIM(COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name'
    )),
    ''
  );

  INSERT INTO public.profiles (id, email, modules_balance, preferred_language, display_name)
  VALUES (NEW.id, NEW.email, 3, v_preferred_language, v_display_name)
  ON CONFLICT (id) DO NOTHING;

  IF FOUND THEN
    INSERT INTO public.modules_ledger (user_id, delta, reason, note)
    VALUES (NEW.id, 3, 'free_signup', 'Welcome bonus on registration');
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
