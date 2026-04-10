-- Create profiles table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  full_name  text,
  target_level text CHECK (target_level IN ('A1', 'A2', 'B1')),
  created_at timestamptz NOT NULL DEFAULT now(),
  exams_taken integer NOT NULL DEFAULT 0,
  is_admin   boolean NOT NULL DEFAULT FALSE
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Index for admin lookup by email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;
