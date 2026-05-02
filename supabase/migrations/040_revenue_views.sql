-- Migration 040: revenue_daily view.
-- Дневная агрегация выручки по APPROVED-платежам (gross, до комиссий эквайринга).
-- Конверсия в USD — на уровне приложения через lib/economy/exchange-rates.ts,
-- чтобы курс брался актуальный, а не зашит в view.

CREATE OR REPLACE VIEW public.revenue_daily AS
SELECT
  DATE(p.created_at AT TIME ZONE 'UTC')               AS day,
  p.amount_currency,
  p.provider                                          AS payment_provider,
  COUNT(*)                                            AS payments_count,
  SUM(p.amount_minor) / 100.0                         AS amount_native,
  SUM(p.package_size + COALESCE(p.promo_bonus_modules, 0)) AS modules_sold
FROM public.payments p
WHERE p.status = 'approved'
GROUP BY 1, 2, 3
ORDER BY 1 DESC;

GRANT SELECT ON public.revenue_daily TO service_role;

COMMENT ON VIEW public.revenue_daily IS
  'Daily revenue aggregation in native currency. Convert to USD in app layer using exchange_rates. Gross only (before acquirer commission).';
