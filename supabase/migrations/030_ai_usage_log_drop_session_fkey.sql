-- 030_ai_usage_log_drop_session_fkey.sql
--
-- Drop FK ai_usage_log_session_id_fkey.
--
-- Reason: the AI usage logger fires from inside lib/claude.ts, lib/elevenlabs.ts
-- and lib/whisper.ts as soon as a provider call completes. For the /api/exam/generate
-- flow, those calls happen *before* the row in exam_sessions is committed, so
-- the FK rejects the insert with `ai_usage_log_session_id_fkey violation`. The
-- logger swallows the error, but the row is lost and AI cost analytics in
-- /admin/economy under-reports.
--
-- Removing the FK keeps session_id as a plain uuid column. Joining
-- ai_usage_log → exam_sessions for analytics still works (via session_id)
-- and rows from in-flight sessions now persist correctly.

ALTER TABLE public.ai_usage_log
  DROP CONSTRAINT IF EXISTS ai_usage_log_session_id_fkey;

NOTIFY pgrst, 'reload schema';
