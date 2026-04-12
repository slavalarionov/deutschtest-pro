# Миграция 009 — заметки

## Применение

1. Открыть Supabase Dashboard → SQL Editor → New query
2. Скопировать содержимое `009_admin_panel.sql`
3. Выполнить
4. Затем выполнить отдельный SQL для назначения админа (см. ниже)
5. Проверить, что в Table Editor появились таблицы: prompts, prompt_versions, promo_codes, promo_redemptions, modules_ledger, feedback
6. Проверить, что в profiles появились колонки is_unlimited, is_blocked

## SQL для назначения админа (выполнить ОТДЕЛЬНО после миграции)

```sql
UPDATE public.profiles
SET is_admin = TRUE
WHERE email = 'larionov38@gmail.com';
```

После выполнения проверить:

```sql
SELECT id, email, is_admin, is_unlimited, modules_balance
FROM public.profiles
WHERE email = 'larionov38@gmail.com';
```

В колонке is_admin должно быть `true`.
