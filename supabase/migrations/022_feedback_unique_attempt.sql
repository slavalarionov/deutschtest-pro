-- 022_feedback_unique_attempt.sql
-- Ограничение «один фидбэк на попытку» — защита от дублей на уровне БД.
-- NULL attempt_id допускается и игнорируется в UNIQUE (partial index).

CREATE UNIQUE INDEX IF NOT EXISTS uq_feedback_attempt
  ON public.feedback(attempt_id)
  WHERE attempt_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
