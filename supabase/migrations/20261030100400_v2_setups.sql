-- v2 · setups: kanvas kurulumu = taslak. Görseller depo yoluyla tutulur, data: adresiyle değil.
begin;

create table public.setups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  flow text not null check (flow in ('campaign', 'recast', 'ghost', 'restyle', 'turn', 'batch')),
  item_name text,
  state jsonb not null default '{}',
  ran boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index setups_user_updated_idx on public.setups (user_id, updated_at desc);

create trigger setups_set_updated_at
  before update on public.setups
  for each row execute function public.set_updated_at();

alter table public.setups enable row level security;
revoke all on table public.setups from public, anon, authenticated;
grant select, insert, update, delete on table public.setups to authenticated;
grant all on table public.setups to service_role;

create policy setups_own on public.setups
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
