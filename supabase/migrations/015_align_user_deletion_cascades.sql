-- 015_align_user_deletion_cascades.sql
-- Цель: выровнять каскадное удаление при удалении пользователя из auth.users.
-- До этой миграции `exam_sessions.user_id` и `user_attempts.user_id` были text без FK,
-- что оставляло осиротевшие строки после удаления юзера. Плюс в exam_sessions лежало
-- 8 строк с user_id = 'anonymous' от доавторизационного режима — они удалены как мусор.

-- 1. Почистить осиротевшие 'anonymous' строки.
--    user_attempts.session_id ON DELETE CASCADE подтянет связанные попытки автоматически.
DELETE FROM public.exam_sessions WHERE user_id = 'anonymous';

-- 2. Защитный ассерт: убедиться, что non-UUID значений больше нет
--    (страховка от гонки между чисткой и ALTER COLUMN).
DO $$
DECLARE
  invalid_count INT;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM public.exam_sessions
  WHERE user_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % rows with non-UUID user_id in exam_sessions. Clean up before migrating.', invalid_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM public.user_attempts
  WHERE user_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % rows with non-UUID user_id in user_attempts. Clean up before migrating.', invalid_count;
  END IF;
END $$;

-- 3. Смена типа text -> uuid. Дефолт 'anonymous' снимается.
ALTER TABLE public.exam_sessions
  ALTER COLUMN user_id DROP DEFAULT,
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

ALTER TABLE public.user_attempts
  ALTER COLUMN user_id DROP DEFAULT,
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

-- 4. FK с ON DELETE CASCADE.
ALTER TABLE public.exam_sessions
  ADD CONSTRAINT exam_sessions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_attempts
  ADD CONSTRAINT user_attempts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Индексы под FK (ускоряют каскадное удаление и админские выборки).
CREATE INDEX IF NOT EXISTS idx_exam_sessions_user_id ON public.exam_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_attempts_user_id ON public.user_attempts(user_id, started_at DESC);

NOTIFY pgrst, 'reload schema';
