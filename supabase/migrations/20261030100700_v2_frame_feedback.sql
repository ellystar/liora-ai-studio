-- v2 · frame_feedback: "Beğendim". Kullanıcı yalnızca kendi karesine yazar.
begin;

create table public.frame_feedback (
  frame_id uuid not null references public.job_frames (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  liked boolean not null,
  created_at timestamptz not null default now(),
  primary key (frame_id, user_id)
);

alter table public.frame_feedback enable row level security;
revoke all on table public.frame_feedback from public, anon, authenticated;
grant select, insert, update, delete on table public.frame_feedback to authenticated;
grant all on table public.frame_feedback to service_role;

create policy frame_feedback_own on public.frame_feedback
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.job_frames f where f.id = frame_id and f.user_id = (select auth.uid()))
  );

commit;
