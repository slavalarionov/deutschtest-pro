-- Migration 038: fixed_costs — учёт постоянных расходов (хостинг, БД, AI-подписки и т.д.).
-- Используется в /admin/economy для расчёта ежемесячной нагрузки и прибыли.
-- Service-role only; UI-CRUD в админке появится в следующих промтах.

CREATE TABLE IF NOT EXISTS public.fixed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  amount_native NUMERIC(10, 2) NOT NULL,
  native_currency TEXT NOT NULL CHECK (native_currency IN ('USD', 'RUB', 'EUR')),
  period TEXT NOT NULL CHECK (period IN ('monthly', 'yearly', 'one_time')),
  category TEXT NOT NULL CHECK (category IN (
    'hosting', 'database', 'cdn', 'email', 'ai_subscription',
    'domain', 'other'
  )),
  started_at DATE NOT NULL,
  ended_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixed_costs_active
  ON public.fixed_costs (ended_at)
  WHERE ended_at IS NULL;

ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on fixed_costs" ON public.fixed_costs;
CREATE POLICY "Service role full access on fixed_costs"
  ON public.fixed_costs FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at trigger в стиле проекта (см. 032_payments_and_promo_flow_a.sql).
CREATE OR REPLACE FUNCTION public.update_fixed_costs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fixed_costs_updated_at ON public.fixed_costs;
CREATE TRIGGER fixed_costs_updated_at
  BEFORE UPDATE ON public.fixed_costs
  FOR EACH ROW EXECUTE FUNCTION public.update_fixed_costs_updated_at();

-- Сидинг текущих известных расходов. Все цифры — placeholder'ы;
-- Слава поправит руками через CRUD-UI в админке (следующий промт).
INSERT INTO public.fixed_costs (name, amount_native, native_currency, period, category, started_at, notes) VALUES
  ('Timeweb FRA-1 (хостинг)', 12.00, 'USD', 'monthly', 'hosting',         '2026-01-01', 'Уточнить точный тариф'),
  ('Supabase Pro',            25.00, 'USD', 'monthly', 'database',        '2026-01-01', 'Уточнить, Pro или Free tier'),
  ('Cloudflare',               0.00, 'USD', 'monthly', 'cdn',             '2026-01-01', 'Free tier'),
  ('Resend',                   0.00, 'USD', 'monthly', 'email',           '2026-01-01', 'Уточнить тариф'),
  ('Domain deutschtest.pro',  15.00, 'USD', 'yearly',  'domain',          '2026-01-01', 'Примерная оценка'),
  ('Claude Code subscription', 100.00, 'USD', 'monthly', 'ai_subscription', '2026-01-01', 'Уточнить тариф')
ON CONFLICT DO NOTHING;
