-- 028_user_recommendations.sql
--
-- Snapshots of AI-generated recommendations. Each generation = a new row, so the
-- public_id remains stable for shared links even after the next generation
-- replaces it. matched_resources stores the join result against learning_resources
-- at generation time — protects shared pages from later resource deactivation.
--
-- profiles.current_recommendations_id points at the latest snapshot; the dashboard
-- view reads through that pointer. Old profiles.cached_recommendations* columns
-- are intentionally left in place as dead data (cleanup migration later).

CREATE TABLE public.user_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  public_id TEXT UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT true,

  weak_areas JSONB NOT NULL,
  summary_text TEXT NOT NULL,
  matched_resources JSONB NOT NULL,

  attempts_count INTEGER NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('de','ru','en','tr')),

  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_recommendations_user_id
  ON public.user_recommendations (user_id, generated_at DESC);

CREATE INDEX idx_user_recommendations_public_id
  ON public.user_recommendations (public_id)
  WHERE public_id IS NOT NULL;

ALTER TABLE public.user_recommendations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles
  ADD COLUMN current_recommendations_id UUID REFERENCES public.user_recommendations(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.current_recommendations_id IS
  'Pointer to the latest user_recommendations snapshot. Updated on every generation. ON DELETE SET NULL so cascading user deletion cleans up cleanly.';

COMMENT ON TABLE public.user_recommendations IS
  'Snapshots of AI recommendations. matched_resources is frozen at generation time — shared public_id keeps showing the original resources even after curation changes.';

NOTIFY pgrst, 'reload schema';
