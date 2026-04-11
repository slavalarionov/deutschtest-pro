-- Per-module credits for paid training (free test / legacy paid attempts use existing logic)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS modules_balance INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN profiles.modules_balance IS 'Prepaid module credits (Lesen/Hören/Schreiben/Sprechen each cost 1)';
