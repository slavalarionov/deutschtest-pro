-- exam_sessions: stores generated exam content and correct answers server-side
create table if not exists public.exam_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default 'anonymous',
  level       text not null check (level in ('A1', 'A2', 'B1')),
  mode        text not null check (mode in ('full', 'lesen', 'horen', 'schreiben', 'sprechen')),
  content     jsonb not null,
  answers     jsonb,
  audio_urls  jsonb,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '24 hours')
);

-- user_attempts: tracks each user's exam attempt with scores and AI feedback
create table if not exists public.user_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null default 'anonymous',
  session_id   uuid not null references public.exam_sessions(id) on delete cascade,
  level        text not null check (level in ('A1', 'A2', 'B1')),
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  scores       jsonb,
  ai_feedback  jsonb
);

-- indexes for common queries
create index if not exists idx_exam_sessions_user_id on public.exam_sessions(user_id);
create index if not exists idx_exam_sessions_expires_at on public.exam_sessions(expires_at);
create index if not exists idx_user_attempts_user_id on public.user_attempts(user_id);
create index if not exists idx_user_attempts_session_id on public.user_attempts(session_id);

-- RLS policies (service_role bypasses RLS, anon blocked)
alter table public.exam_sessions enable row level security;
alter table public.user_attempts enable row level security;
