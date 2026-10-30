-- v2 · user_poses: kullanıcının kaydettiği pozlar ("Pozlarım"). poses tablosu herkese açık okunduğu için ayrı tablo.
begin;

create table public.user_poses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  prompt text not null,
  thumbnail_path text,
  source_job_id uuid references public.jobs (id) on delete set null,
  created_at timestamptz not null default now()
);

create index user_poses_user_idx on public.user_poses (user_id, created_at desc);

alter table public.user_poses enable row level security;
revoke all on table public.user_poses from public, anon, authenticated;
grant select, insert, update, delete on table public.user_poses to authenticated;
grant all on table public.user_poses to service_role;

create policy user_poses_own on public.user_poses
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
