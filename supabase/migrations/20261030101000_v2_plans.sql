-- v2 · plans: paketler. Elif'in fiyatları active = false girilir (Kural 6); geçişte açılır.
-- trial_credits: Free paketin tek seferlik kredisi; aylık krediyle karışmasın diye ayrı.
-- price_try boş: TL fiyatı PayTR entegrasyonunda kararlaştırılacak.
begin;

create table public.plans (
  id text primary key check (id in ('explorer', 'creator', 'partner', 'enterprise')),
  name text not null,
  monthly_credits integer not null default 0 check (monthly_credits >= 0),
  trial_credits integer not null default 0 check (trial_credits >= 0),
  price_usd numeric(10, 2) check (price_usd >= 0),
  price_try numeric(10, 2) check (price_try >= 0),
  active boolean not null default false,
  sort integer not null default 0
);

alter table public.plans enable row level security;
revoke all on table public.plans from public, anon, authenticated;
grant select on table public.plans to anon, authenticated;
grant insert, update, delete on table public.plans to authenticated;
grant all on table public.plans to service_role;

create policy plans_select_active on public.plans
  for select to anon, authenticated
  using (active);

create policy plans_admin_all on public.plans
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.plans (id, name, monthly_credits, trial_credits, price_usd, active, sort) values
  ('explorer', 'Free', 0, 5, 0, false, 1),
  ('creator', 'Basic', 30, 0, 30, false, 2),
  ('partner', 'Pro', 100, 0, 100, false, 3),
  ('enterprise', 'Enterprise', 0, 0, null, false, 4);

commit;
