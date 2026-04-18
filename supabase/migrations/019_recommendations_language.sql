-- 019_recommendations_language.sql
-- Добавляет поле cached_recommendations_language в profiles.
-- Используется для определения, на каком языке закеширован текущий результат.
-- При несовпадении с profiles.preferred_language кеш инвалидируется
-- и рекомендации перегенерируются.

ALTER TABLE public.profiles
  ADD COLUMN cached_recommendations_language TEXT
  CHECK (cached_recommendations_language IS NULL
         OR cached_recommendations_language IN ('de', 'ru', 'en', 'tr'));

COMMENT ON COLUMN public.profiles.cached_recommendations_language IS
  'Language of the currently cached_recommendations. NULL if cache is empty. Compared to preferred_language for invalidation.';

NOTIFY pgrst, 'reload schema';
