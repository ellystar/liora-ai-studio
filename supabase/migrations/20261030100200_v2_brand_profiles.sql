-- v2 · brand_profiles: onboarding cevapları (1:1). Kullanıcı kendi satırını yazar.
begin;

create table public.brand_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  shoot_for text check (shoot_for in ('own', 'employer', 'agency', 'explore')),
  brand_count text,
  who text[] not null default '{}',
  ages text[] not null default '{}',
  kid_ages text[] not null default '{}',
  tier text check (tier in ('daily', 'considered', 'premium', 'luxury')),
  style_ids text[] not null default '{}',
  style jsonb not null default '{}',
  channels text[] not null default '{}',
  waitlist text,
  job text,
  job_other text,
  why text,
  tools text[] not null default '{}',
  site_read text,
  prefilled text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create trigger brand_profiles_set_updated_at
  before update on public.brand_profiles
  for each row execute function public.set_updated_at();

alter table public.brand_profiles enable row level security;
revoke all on table public.brand_profiles from public, anon, authenticated;
grant select, insert, update, delete on table public.brand_profiles to authenticated;
grant all on table public.brand_profiles to service_role;

create policy brand_profiles_own on public.brand_profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
