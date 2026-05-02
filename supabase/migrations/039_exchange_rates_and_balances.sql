-- Migration 039: exchange_rates + provider_balances_manual.
-- exchange_rates — БД-кеш курсов валют (источник: frankfurter.dev / ECB).
--   Используется в lib/economy/exchange-rates.ts для конверсии в USD
--   доходов из RUB/EUR. Кеш на 24 часа.
-- provider_balances_manual — история ручных вводов балансов AI-провайдеров
--   (Anthropic, OpenAI prepaid). Текущий баланс — последняя запись.
--   ElevenLabs тянется через API, но колонка оставлена для совместимости
--   ручного ввода при нештатных ситуациях.

-- ───────────── exchange_rates ─────────────
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  quote_currency TEXT NOT NULL,
  rate NUMERIC(12, 6) NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'frankfurter.dev',
  CONSTRAINT exchange_rates_pair_at UNIQUE (base_currency, quote_currency, fetched_at)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_latest
  ON public.exchange_rates (base_currency, quote_currency, fetched_at DESC);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on exchange_rates" ON public.exchange_rates;
CREATE POLICY "Service role full access on exchange_rates"
  ON public.exchange_rates FOR ALL
  USING (auth.role() = 'service_role');

-- Fallback-значения на случай, если внешний API недоступен в момент
-- первого запроса. Перезапишутся первым успешным fetch'ем.
INSERT INTO public.exchange_rates (base_currency, quote_currency, rate, source) VALUES
  ('USD', 'RUB', 95.00, 'fallback'),
  ('USD', 'EUR', 0.92,  'fallback')
ON CONFLICT DO NOTHING;

-- ───────────── provider_balances_manual ─────────────
CREATE TABLE IF NOT EXISTS public.provider_balances_manual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('anthropic', 'openai', 'elevenlabs')),
  balance_usd NUMERIC(10, 2) NOT NULL,
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_provider_balances_latest
  ON public.provider_balances_manual (provider, recorded_at DESC);

ALTER TABLE public.provider_balances_manual ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on provider_balances_manual" ON public.provider_balances_manual;
CREATE POLICY "Service role full access on provider_balances_manual"
  ON public.provider_balances_manual FOR ALL
  USING (auth.role() = 'service_role');
