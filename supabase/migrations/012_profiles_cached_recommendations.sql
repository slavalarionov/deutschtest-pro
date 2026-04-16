-- Миграция 012: кеш AI-рекомендаций в profiles
-- Храним сгенерированные Claude рекомендации прямо в профиле, чтобы не платить
-- за генерацию при каждом заходе на /dashboard/recommendations. Вместе с самим
-- JSON храним количество user_attempts на момент генерации — это наш invalidation
-- signal: как только пользователь прошёл новый модуль, кеш считается устаревшим.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cached_recommendations jsonb,
  ADD COLUMN IF NOT EXISTS recommendations_attempts_count integer,
  ADD COLUMN IF NOT EXISTS recommendations_generated_at timestamptz;

-- Перезагружаем PostgREST, чтобы он увидел новые колонки
NOTIFY pgrst, 'reload schema';
