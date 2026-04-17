-- Миграция 017: При регистрации юзеру автоматически начисляется 3 бесплатных модуля.
--
-- До этого момента:
--   • profiles.modules_balance default = 0
--   • триггер handle_new_user создавал profile с дефолтом 0
-- Теперь:
--   • default колонки = 3
--   • триггер явно ставит 3 (на случай если Supabase signUp flow не триггерит default)
--   • каждая вставка сопровождается записью в modules_ledger (reason='free_signup')
--     для аудита и согласованности с billing.ts

ALTER TABLE public.profiles
  ALTER COLUMN modules_balance SET DEFAULT 3;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, modules_balance)
  VALUES (NEW.id, NEW.email, 3)
  ON CONFLICT (id) DO NOTHING;

  -- Аудит в ledger только если профиль действительно создан (без конфликта).
  IF FOUND THEN
    INSERT INTO public.modules_ledger (user_id, delta, reason, note)
    VALUES (NEW.id, 3, 'free_signup', 'Welcome bonus on registration');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
