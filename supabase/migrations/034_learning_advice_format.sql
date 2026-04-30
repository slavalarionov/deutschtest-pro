-- 034_learning_advice_format.sql
--
-- Расширяет learning_resources под новый формат: «обучающий совет» (resource_type='advice')
-- хранится не как ссылка, а как структурированный JSON в колонке body со схемой
-- {why, steps[], drill, avoid, progress}. Старый формат внешних ресурсов
-- (book/video/exercise/website/app/article) продолжает работать без изменений.
--
-- Гарантии целостности через CHECK content_check:
--   - advice → body NOT NULL и body — JSON-объект; url может быть NULL
--   - non-advice → url NOT NULL и непустой; body может быть NULL

ALTER TABLE public.learning_resources
  ALTER COLUMN url DROP NOT NULL;

ALTER TABLE public.learning_resources
  ADD COLUMN body jsonb;

ALTER TABLE public.learning_resources
  DROP CONSTRAINT learning_resources_resource_type_check;

ALTER TABLE public.learning_resources
  ADD CONSTRAINT learning_resources_resource_type_check
  CHECK (resource_type IN ('book','video','exercise','website','app','article','advice'));

ALTER TABLE public.learning_resources
  ADD CONSTRAINT learning_resources_content_check
  CHECK (
    (resource_type = 'advice' AND body IS NOT NULL AND jsonb_typeof(body) = 'object') OR
    (resource_type <> 'advice' AND url IS NOT NULL AND length(url) > 0)
  );

CREATE INDEX IF NOT EXISTS idx_learning_resources_body
  ON public.learning_resources USING gin (body);

COMMENT ON COLUMN public.learning_resources.body IS
  'For resource_type=advice: JSON {why, steps[], drill, avoid, progress}. For other types: NULL.';

NOTIFY pgrst, 'reload schema';
