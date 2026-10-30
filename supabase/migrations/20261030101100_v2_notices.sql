-- v2 · notices: bildirimler. Sunucu yazar; kullanıcı yalnızca read_at'i işaretler.
begin;

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('done', 'failed', 'salon', 'cast', 'review', 'expiring', 'low')),
  title jsonb not null,
  body jsonb,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notices_user_created_idx on public.notices (user_id, created_at desc);

alter table public.notices enable row level security;
revoke all on table public.notices from public, anon, authenticated;
grant select on table public.notices to authenticated;
grant update (read_at) on table public.notices to authenticated;
grant all on table public.notices to service_role;

create policy notices_select_own on public.notices
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy notices_update_own on public.notices
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
