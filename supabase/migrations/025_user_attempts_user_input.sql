-- Migration 025: persist user-submitted content per attempt
--
-- Adds a single jsonb column to user_attempts so the results page can show
-- the actual text the user wrote (Schreiben) and the transcript of what
-- they said (Sprechen). Previously this content lived only in the request
-- payload during submit and was discarded after scoring.
--
-- Schema is module-dependent and intentionally loose. Today we write:
--   { schreiben: { text: string, wordCount?: number } }
--   { sprechen:  { transcript: string, durationSeconds?: number } }
-- Lesen and Hören have no separate user_input — clicked answers are
-- already captured in scores / ai_feedback.
--
-- Existing rows stay NULL: no backfill — old attempts simply show an
-- "answer not saved" notice on the results page.

ALTER TABLE public.user_attempts
  ADD COLUMN IF NOT EXISTS user_input jsonb;

COMMENT ON COLUMN public.user_attempts.user_input IS
  'User-submitted content per module: { schreiben: { text, wordCount? }, sprechen: { transcript, durationSeconds? } }. Schema is module-dependent and may evolve.';

NOTIFY pgrst, 'reload schema';
