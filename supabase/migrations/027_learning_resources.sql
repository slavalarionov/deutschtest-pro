-- 027_learning_resources.sql
--
-- Curated catalog of external learning materials (books, videos, exercises, websites,
-- apps, articles) used by the new tool-use recommendations flow. The AI classifies
-- weak areas via a fixed set of topic tags; the server then matches those tags to
-- this table and snapshots the URLs into user_recommendations.matched_resources.
--
-- Topic enum is intentionally locked via CHECK so accidental free-form values from
-- the AI cannot land here — broaden via ALTER TABLE ... DROP CONSTRAINT + ADD when
-- the curriculum grows.

CREATE TABLE public.learning_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL CHECK (module IN ('lesen','horen','schreiben','sprechen')),
  level TEXT NOT NULL CHECK (level IN ('a1','a2','b1')),
  topic TEXT NOT NULL CHECK (topic IN (
    'modal-verben','perfekt','prateritum','konjunktiv',
    'prapositionen','cases','briefe','inhaltspunkte',
    'wortschatz','aussprache','dialoge',
    'texts-reading','audio-listening','general'
  )),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('book','video','exercise','website','app','article')),
  description TEXT,
  language TEXT NOT NULL DEFAULT 'de' CHECK (language IN ('de','ru','en')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_learning_resources_match
  ON public.learning_resources (module, level, topic, language)
  WHERE is_active = true;

CREATE INDEX idx_learning_resources_topic
  ON public.learning_resources (topic)
  WHERE is_active = true;

ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_learning_resources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_learning_resources_updated_at
  BEFORE UPDATE ON public.learning_resources
  FOR EACH ROW EXECUTE FUNCTION update_learning_resources_updated_at();

COMMENT ON TABLE public.learning_resources IS
  'Curated learning materials. AI classifies weak areas via topic tags (closed enum), server matches with this table and snapshots URLs into user_recommendations.matched_resources.';

NOTIFY pgrst, 'reload schema';
