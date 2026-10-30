-- v2 · frame_reviews: beğenmedim ve iade talebi. Kullanıcı talep açar (kare başına bir kez).
-- Karar ve iade yalnızca sunucu; admin RPC'si Aşama 5'te eklenir.
begin;

create table public.frame_reviews (
  id uuid primary key default gen_random_uuid(),
  frame_id uuid not null unique references public.job_frames (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reasons text[] not null check (
    cardinality(reasons) > 0
    and reasons <@ array['product', 'model', 'framing', 'quality', 'other']::text[]
  ),
  note text,
  status text not null default 'pending' check (status in ('pending', 'refunded', 'declined')),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decision_reason text,
  refund_amount integer check (refund_amount >= 0),
  created_at timestamptz not null default now()
);

create index frame_reviews_user_idx on public.frame_reviews (user_id, created_at desc);
create index frame_reviews_pending_idx on public.frame_reviews (created_at) where status = 'pending';

alter table public.frame_reviews enable row level security;
revoke all on table public.frame_reviews from public, anon, authenticated;
grant select on table public.frame_reviews to authenticated;
-- sütun izni: durum ve karar alanlarını kullanıcı veremez
grant insert (frame_id, user_id, reasons, note) on table public.frame_reviews to authenticated;
grant all on table public.frame_reviews to service_role;

create policy frame_reviews_select_own on public.frame_reviews
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy frame_reviews_insert_own on public.frame_reviews
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.job_frames f where f.id = frame_id and f.user_id = (select auth.uid()))
  );

commit;
