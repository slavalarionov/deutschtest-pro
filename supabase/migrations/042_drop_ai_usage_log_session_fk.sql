-- Миграция 042: гарантированно снять FK ai_usage_log.session_id → exam_sessions.
--
-- Миграция 030 уже снимала этот FK (и pg_constraint на проде сейчас его НЕ
-- содержит). Но в логах Timeweb засветился insert_or_update violation на
-- ai_usage_log_session_id_fkey — могло быть либо до наката 030, либо в
-- сценарии, когда constraint регенерировался (например, ручной откат
-- 030, восстановление БД и т.д.).
--
-- DROP CONSTRAINT IF EXISTS делает миграцию идемпотентной: если FK уже
-- снят (типичная ситуация на проде сейчас), миграция — no-op. Если FK
-- внезапно вернётся, она его снимет.

ALTER TABLE public.ai_usage_log
  DROP CONSTRAINT IF EXISTS ai_usage_log_session_id_fkey;
