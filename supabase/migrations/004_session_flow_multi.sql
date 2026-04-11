-- Allow session_flow = 'multi' for user-selected module subsets
alter table public.exam_sessions
  drop constraint if exists exam_sessions_session_flow_check;

alter table public.exam_sessions
  add constraint exam_sessions_session_flow_check
  check (session_flow in ('single', 'multi', 'full_test'));

comment on column public.exam_sessions.session_flow is 'single = one module; multi = custom subset; full_test = legacy four-in-one (mode full)';
