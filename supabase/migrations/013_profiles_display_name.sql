-- Миграция 013: display_name в profiles
-- Отдельная колонка под имя, которое пользователь может менять в /dashboard/settings.
-- full_name заполняется при регистрации/OAuth и не редактируется из UI; display_name —
-- это то, что пользователь сам вводит для отображения.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text;

NOTIFY pgrst, 'reload schema';
