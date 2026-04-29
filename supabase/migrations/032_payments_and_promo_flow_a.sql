-- ========================================================================
-- Phase 4: Tochka acquiring infrastructure
-- 032: payments table + promo Flow A + approve_payment_atomic RPC
-- Applied via mcp__supabase__apply_migration on 2026-04-29.
-- ========================================================================

-- Часть 1: таблица payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  provider TEXT NOT NULL CHECK (provider IN ('tochka', 'prodamus')),
  provider_operation_id TEXT,
  provider_payment_link TEXT,

  order_id TEXT NOT NULL UNIQUE,

  package_id TEXT NOT NULL CHECK (package_id IN (
    'ru-starter', 'ru-standard', 'ru-intensive',
    'eu-starter', 'eu-standard', 'eu-intensive',
    '_admin-test'
  )),
  package_size INTEGER NOT NULL CHECK (package_size > 0),

  amount_currency TEXT NOT NULL CHECK (amount_currency IN ('RUB', 'EUR')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),

  promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  promo_discount_minor INTEGER NOT NULL DEFAULT 0,
  promo_bonus_modules INTEGER NOT NULL DEFAULT 0,

  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'failed', 'refunded', 'expired')),
  status_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  payment_method TEXT,
  locale_at_purchase TEXT NOT NULL CHECK (locale_at_purchase IN ('ru', 'de', 'en', 'tr')),
  user_agent TEXT,
  ip_address INET,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_operation
  ON public.payments(provider, provider_operation_id)
  WHERE provider_operation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_pending
  ON public.payments(status, created_at)
  WHERE status = 'pending';

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own payments" ON public.payments;
CREATE POLICY "Users see own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access on payments" ON public.payments;
CREATE POLICY "Service role full access on payments"
  ON public.payments FOR ALL
  USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_payments_updated_at();

-- Часть 2: расширение promo_codes под Flow A
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS flow TEXT NOT NULL DEFAULT 'b'
    CHECK (flow IN ('a', 'b'));
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS discount_percent INTEGER
    CHECK (discount_percent IS NULL OR (discount_percent BETWEEN 1 AND 100));
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS bonus_modules INTEGER NOT NULL DEFAULT 0
    CHECK (bonus_modules >= 0);
ALTER TABLE public.promo_codes
  ADD COLUMN IF NOT EXISTS market TEXT NOT NULL DEFAULT 'all'
    CHECK (market IN ('ru', 'eu', 'all'));

ALTER TABLE public.promo_codes
  DROP CONSTRAINT IF EXISTS promo_codes_flow_a_has_discount;
ALTER TABLE public.promo_codes
  ADD CONSTRAINT promo_codes_flow_a_has_discount
    CHECK (flow = 'b' OR discount_percent IS NOT NULL);

-- Часть 3: расширение modules_ledger связью с payment
ALTER TABLE public.modules_ledger
  ADD COLUMN IF NOT EXISTS related_payment_id UUID
    REFERENCES public.payments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_modules_ledger_related_payment
  ON public.modules_ledger(related_payment_id)
  WHERE related_payment_id IS NOT NULL;

-- Часть 4: SQL-функция approve_payment_atomic (атомарное идемпотентное начисление)
CREATE OR REPLACE FUNCTION public.approve_payment_atomic(
  p_provider_operation_id TEXT,
  p_payment_method TEXT
) RETURNS TABLE (
  payment_id UUID,
  user_id UUID,
  modules_credited INTEGER,
  promo_code_id UUID,
  was_already_approved BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_total_modules INTEGER;
  v_ledger_reason TEXT;
BEGIN
  SELECT * INTO v_payment
  FROM payments
  WHERE provider_operation_id = p_provider_operation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;

  IF v_payment.status = 'approved' THEN
    RETURN QUERY SELECT
      v_payment.id,
      v_payment.user_id,
      0,
      v_payment.promo_code_id,
      TRUE;
    RETURN;
  END IF;

  IF v_payment.status != 'pending' THEN
    RAISE EXCEPTION 'invalid_payment_status: %', v_payment.status;
  END IF;

  v_total_modules := v_payment.package_size + v_payment.promo_bonus_modules;

  UPDATE payments
  SET status = 'approved',
      payment_method = p_payment_method,
      status_updated_at = now()
  WHERE id = v_payment.id;

  UPDATE profiles
  SET modules_balance = modules_balance + v_total_modules
  WHERE id = v_payment.user_id;

  v_ledger_reason := 'payment:' || v_payment.provider || ':' || v_payment.order_id;

  INSERT INTO modules_ledger (
    user_id,
    delta,
    reason,
    related_payment_id,
    related_promo_id,
    performed_by,
    note
  ) VALUES (
    v_payment.user_id,
    v_total_modules,
    v_ledger_reason,
    v_payment.id,
    v_payment.promo_code_id,
    NULL,
    'Auto-credit on payment approval'
  );

  RETURN QUERY SELECT
    v_payment.id,
    v_payment.user_id,
    v_total_modules,
    v_payment.promo_code_id,
    FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_payment_atomic(TEXT, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
