-- Full-test flow: session_flow + current_module (mode stays 'full' for aggregated results)
alter table public.exam_sessions
  add column if not exists session_flow text not null default 'single'
    check (session_flow in ('single', 'full_test'));

alter table public.exam_sessions
  add column if not exists current_module text
    check (
      current_module is null
      or current_module in ('lesen', 'horen', 'schreiben', 'sprechen', 'completed')
    );

comment on column public.exam_sessions.session_flow is 'single = one module; full_test = all four in sequence';
comment on column public.exam_sessions.current_module is 'Progress within full_test; null for single-module sessions';
