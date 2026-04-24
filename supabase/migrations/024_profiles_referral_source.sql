-- 024_profiles_referral_source.sql
-- Attribution-опрос после регистрации: «Откуда вы о нас узнали?»
-- Показывается один раз при первом заходе на /dashboard после подтверждения email.
--
-- referral_source — выбранный канал (NULL если пользователь пропустил опрос).
-- referral_source_asked — флаг «опрос уже был показан», чтобы не спрашивать повторно.
-- Индекс не добавляем: админ-дашборд источников строится редко, full-scan дёшев.

ALTER TABLE public.profiles
  ADD COLUMN referral_source TEXT
    CHECK (referral_source IS NULL OR referral_source IN
      ('ai', 'search', 'friend', 'teacher', 'ads', 'social', 'other')),
  ADD COLUMN referral_source_asked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.referral_source IS
  'Attribution: how user discovered the product (filled once on first dashboard visit after email confirm)';

COMMENT ON COLUMN public.profiles.referral_source_asked IS
  'Whether the onboarding attribution survey was shown (true = shown regardless of answer, prevents re-asking)';

NOTIFY pgrst, 'reload schema';
