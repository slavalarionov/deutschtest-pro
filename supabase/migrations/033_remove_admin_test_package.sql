-- Remove '_admin-test' from payments.package_id CHECK constraint.
-- Migration 032 introduced this value for an admin smoke-test endpoint that
-- was deleted in the same change-set as this migration. Real smoke-tests now
-- use a regular ru-starter purchase so the row is indistinguishable from
-- real revenue in analytics.
--
-- Applied via mcp__supabase__apply_migration on 2026-04-29.

DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM payments WHERE package_id = '_admin-test';
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Cannot remove _admin-test from CHECK: % rows exist with this package_id. Resolve manually.', v_count;
  END IF;
END $$;

ALTER TABLE public.payments DROP CONSTRAINT payments_package_id_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_package_id_check
  CHECK (package_id IN (
    'ru-starter', 'ru-standard', 'ru-intensive',
    'eu-starter', 'eu-standard', 'eu-intensive'
  ));

NOTIFY pgrst, 'reload schema';
