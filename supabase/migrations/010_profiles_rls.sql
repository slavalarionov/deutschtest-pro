-- Миграция 010: RLS policies для profiles
-- Раньше на profiles был включён RLS, но не было ни одной policy —
-- это блокировало чтение даже для самого юзера. Добавляем минимальный набор.

-- Пользователь может читать свой собственный профиль
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Пользователь может обновлять свой собственный профиль (для будущих фич вроде смены full_name)
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- INSERT не разрешаем юзерам напрямую — профили создаются триггером handle_new_user
-- при регистрации, работающим через service role.

-- Service role всегда обходит RLS и имеет полный доступ — отдельная policy не нужна.
