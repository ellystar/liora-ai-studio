-- v2 · notification_prefs: bildirim tercihleri, tür başına bir satır.
begin;

create table public.notification_prefs (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('done', 'failed', 'salon', 'cast', 'review', 'expiring', 'low')),
  panel boolean not null default true,
  mail boolean not null default true,
  primary key (user_id, kind)
);

alter table public.notification_prefs enable row level security;
revoke all on table public.notification_prefs from public, anon, authenticated;
grant select, insert, update, delete on table public.notification_prefs to authenticated;
grant all on table public.notification_prefs to service_role;

create policy notification_prefs_own on public.notification_prefs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
