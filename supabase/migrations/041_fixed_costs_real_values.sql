-- Migration 041: реальные значения fixed_costs + сброс fallback-курсов.
--
-- Сидинг из 038 был placeholder'ом ("уточнить у Славы"). Финальный
-- список подтверждён 02 МАЯ 2026:
--   Timeweb Cloud FRA-1 — 900 ₽/мес (рублёвый billing)
--   Supabase / Cloudflare / Resend — Free tier ($0, оставляем для
--     прозрачности; легко поправим, если перейдут на платный)
--   Domain deutschtest.pro — $15/год
--   Claude Max — $100/мес (100% использования под DeutschTest.pro)
--
-- Также чистим fallback-сидинг exchange_rates, чтобы при первом
-- обращении к админке lib/economy/exchange-rates.ts сходил на
-- frankfurter.dev и закешировал актуальный курс.

TRUNCATE TABLE public.fixed_costs;

INSERT INTO public.fixed_costs (name, amount_native, native_currency, period, category, started_at, notes) VALUES
  ('Timeweb Cloud (FRA-1)',   900.00, 'RUB', 'monthly', 'hosting',         '2026-01-01', NULL),
  ('Supabase',                  0.00, 'USD', 'monthly', 'database',        '2026-01-01', 'Free tier'),
  ('Cloudflare',                0.00, 'USD', 'monthly', 'cdn',             '2026-01-01', 'Free tier'),
  ('Resend',                    0.00, 'USD', 'monthly', 'email',           '2026-01-01', 'Free tier'),
  ('Domain deutschtest.pro',   15.00, 'USD', 'yearly',  'domain',          '2026-01-01', NULL),
  ('Claude Max',              100.00, 'USD', 'monthly', 'ai_subscription', '2026-01-01', '100% used for DeutschTest.pro work');

DELETE FROM public.exchange_rates WHERE source = 'fallback';
