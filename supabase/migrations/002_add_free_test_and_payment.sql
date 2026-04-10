-- Add free test tracking and payment status to user_attempts
ALTER TABLE public.user_attempts
  ADD COLUMN IF NOT EXISTS is_free_test BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.user_attempts
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'free'
  CHECK (payment_status IN ('free', 'paid', 'pending'));

-- Index for fast free-test lookups per user
CREATE INDEX IF NOT EXISTS idx_user_attempts_free_test
  ON public.user_attempts(user_id, is_free_test)
  WHERE is_free_test = TRUE;

-- Index for payment status queries
CREATE INDEX IF NOT EXISTS idx_user_attempts_payment_status
  ON public.user_attempts(user_id, payment_status);
