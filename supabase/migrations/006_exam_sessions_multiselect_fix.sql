-- Fix "Datenbank-Schema veraltet" / insert failures for multiselect exams.
-- Safe to run once on production Supabase (idempotent).
-- Run in: Supabase Dashboard → SQL Editor → New query → paste → Run.

-- 1) mode: allow comma-separated lists (lesen,horen,…)
ALTER TABLE public.exam_sessions DROP CONSTRAINT IF EXISTS exam_sessions_mode_check;

-- 2) Columns used by the app
ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS completed_modules text NOT NULL DEFAULT '';

ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS session_flow text NOT NULL DEFAULT 'single';

ALTER TABLE public.exam_sessions
  ADD COLUMN IF NOT EXISTS current_module text;

COMMENT ON COLUMN public.exam_sessions.completed_modules IS 'Comma-separated completed modules (exam order)';
COMMENT ON COLUMN public.exam_sessions.session_flow IS 'single | multi | full_test';
COMMENT ON COLUMN public.exam_sessions.current_module IS 'Active module or completed';

-- 3) Drop any old CHECK constraints tied to session_flow (names differ across PG / migration history)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'exam_sessions'
      AND c.contype = 'c'
      AND (
        c.conname ILIKE '%session_flow%'
        OR pg_get_constraintdef(c.oid) ILIKE '%session_flow%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.exam_sessions DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.exam_sessions
  ADD CONSTRAINT exam_sessions_session_flow_check
  CHECK (session_flow IN ('single', 'multi', 'full_test'));

-- 4) Normalize current_module CHECK
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'exam_sessions'
      AND c.contype = 'c'
      AND (
        c.conname ILIKE '%current_module%'
        OR pg_get_constraintdef(c.oid) ILIKE '%current_module%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.exam_sessions DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.exam_sessions
  ADD CONSTRAINT exam_sessions_current_module_check
  CHECK (
    current_module IS NULL
    OR current_module IN ('lesen', 'horen', 'schreiben', 'sprechen', 'completed')
  );
