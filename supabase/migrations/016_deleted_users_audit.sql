-- 016_deleted_users_audit.sql
-- Аудит-лог удалений пользователей. Админ хард-делитит юзера —
-- сюда ложится снимок минимальных полей, чтобы иметь след «кого и когда грохнули».

CREATE TABLE public.deleted_users_audit (
  id BIGSERIAL PRIMARY KEY,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  email TEXT,
  display_name TEXT,
  modules_balance_at_delete INT,
  attempts_count_at_delete INT,
  was_admin BOOLEAN,
  was_unlimited BOOLEAN,
  note TEXT
);

COMMENT ON COLUMN public.deleted_users_audit.user_id IS
  'Snapshot of auth.users.id at deletion time. No FK by design — row persists after target is gone.';

CREATE INDEX idx_deleted_users_audit_deleted_at ON public.deleted_users_audit(deleted_at DESC);
CREATE INDEX idx_deleted_users_audit_deleted_by ON public.deleted_users_audit(deleted_by);

ALTER TABLE public.deleted_users_audit ENABLE ROW LEVEL SECURITY;
-- Никаких policy — доступ только через service role (как у ai_usage_log).

NOTIFY pgrst, 'reload schema';
