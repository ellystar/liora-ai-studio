-- v2 · consents: izinlerin kaydı. Kullanıcı yeni satır ekler, mevcut satırı değiştiremez.
begin;

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('terms', 'news', 'chat', 'partner')),
  granted boolean not null,
  text_version text not null,
  source text not null check (source in ('signup', 'profile')),
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index consents_user_kind_idx on public.consents (user_id, kind, created_at desc);

alter table public.consents enable row level security;
revoke all on table public.consents from public, anon, authenticated;
grant select, insert on table public.consents to authenticated;
grant all on table public.consents to service_role;

create policy consents_select_own on public.consents
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy consents_insert_own on public.consents
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

commit;
