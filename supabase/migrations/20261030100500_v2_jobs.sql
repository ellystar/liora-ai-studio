-- v2 · jobs: bir üretim (İşlerim'deki kart). Yazma yalnızca sunucu (service role).
begin;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  setup_id uuid references public.setups (id) on delete set null,
  flow text not null check (flow in ('campaign', 'recast', 'ghost', 'restyle', 'turn', 'batch')),
  title text not null default '',
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed', 'cancelled')),
  planned integer not null default 0 check (planned >= 0),
  done integer not null default 0 check (done >= 0),
  failed integer not null default 0 check (failed >= 0),
  credits_spent integer not null default 0 check (credits_spent >= 0),
  params jsonb not null default '{}',
  cover_path text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz
);

create index jobs_user_created_idx on public.jobs (user_id, created_at desc);
create index jobs_unfinished_idx on public.jobs (status, created_at) where status in ('queued', 'running');

alter table public.jobs enable row level security;
revoke all on table public.jobs from public, anon, authenticated;
grant select on table public.jobs to authenticated;
grant all on table public.jobs to service_role;

create policy jobs_select_own on public.jobs
  for select to authenticated
  using ((select auth.uid()) = user_id);

commit;
