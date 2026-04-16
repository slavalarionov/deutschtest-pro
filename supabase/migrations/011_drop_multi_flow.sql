-- Убираем multi-flow: теперь каждая сессия = один модуль.
-- Колонки session_flow, current_module, completed_modules ОСТАЮТСЯ (для чтения старых данных),
-- но новое приложение их не использует.

-- 1) Сделать mode default 'single' (на уровне DDL)
ALTER TABLE public.exam_sessions
  ALTER COLUMN mode SET DEFAULT 'single';

-- 2) Перезагрузить PostgREST, чтобы подхватил default
NOTIFY pgrst, 'reload schema';
