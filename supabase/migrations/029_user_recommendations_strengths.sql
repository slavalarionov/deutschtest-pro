-- 029_user_recommendations_strengths.sql
--
-- Adaptive "strengths" block: short list of relative strengths Claude
-- identifies alongside weak_areas. Stored as a separate jsonb column so
-- the snapshot has explicit shape and the page can render the block
-- conditionally on length > 0. DEFAULT '[]' keeps existing rows valid —
-- the UI just won't render anything for them.

ALTER TABLE public.user_recommendations
  ADD COLUMN strengths JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.user_recommendations.strengths IS
  'Array of relative strengths Claude identified at generation time. May be empty if no notable strengths exist yet. Shape: { module, level, what_works, evidence }[].';

NOTIFY pgrst, 'reload schema';
