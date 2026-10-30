-- v2 · accounts: profiles'ın yanında hesap bilgisi (1:1). Yalnızca ekleme.
-- Yazma: yalnızca sunucu ve RPC'ler (complete_signup, update_account); plan yalnızca sunucu.
begin;

create table public.accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._]{3,20}$'),
  name text,
  brand text,
  website text,
  plan text not null default 'explorer' check (plan in ('explorer', 'creator', 'partner', 'enterprise')),
  plan_renews_at timestamptz,
  cancel_at_period_end boolean not null default false,
  onboarded boolean not null default false,
  trial_granted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;
revoke all on table public.accounts from public, anon, authenticated;
grant select on table public.accounts to authenticated;
grant all on table public.accounts to service_role;

create policy accounts_select_own on public.accounts
  for select to authenticated
  using ((select auth.uid()) = user_id);

commit;
