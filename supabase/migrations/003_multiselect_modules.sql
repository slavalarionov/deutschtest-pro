-- Allow comma-separated module lists in mode (e.g. lesen,horen,sprechen)
alter table public.exam_sessions
  drop constraint if exists exam_sessions_mode_check;

comment on column public.exam_sessions.mode is 'Single module id or comma-separated list in exam order, e.g. lesen,horen,schreiben';

alter table public.exam_sessions
  add column if not exists completed_modules text not null default '';

comment on column public.exam_sessions.completed_modules is 'Comma-separated completed modules (exam order), e.g. lesen,horen';
