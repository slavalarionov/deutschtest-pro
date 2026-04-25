-- 026_exam_sessions_public_id.sql
--
-- Adds shareable-URL support to exam_sessions:
--   public_id  — short slug (10-char nanoid) used in /result/{public_id}.
--                Generated lazily on first share, NULL otherwise. Partial
--                unique index keeps the namespace tight.
--   is_public  — toggle for the public link. Default true so result pages
--                are shareable as soon as a public_id is generated; user
--                can flip to false to disable.

ALTER TABLE public.exam_sessions
  ADD COLUMN public_id TEXT UNIQUE,
  ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.exam_sessions.public_id IS
  'Short ID for public shareable URL /result/{public_id}. Generated lazily on first share via /api/exam/[sessionId]/share. NULL means session has not been shared yet.';

COMMENT ON COLUMN public.exam_sessions.is_public IS
  'Whether result page is publicly accessible via /result/{public_id}. Default true; user can flip to false via share UI to disable the public link.';

CREATE INDEX IF NOT EXISTS idx_exam_sessions_public_id
  ON public.exam_sessions(public_id)
  WHERE public_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
