-- v2 · job_frames: işin her karesi ve sürümleri. Yazma yalnızca sunucu.
-- generation_images silinirse bağ boşalır; canlı temizlik işi hiçbir zaman engellenmez.
begin;

create table public.job_frames (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  idx integer not null check (idx >= 0),
  pose_key text,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  generation_image_id uuid references public.generation_images (id) on delete set null,
  storage_path text,
  error_code text,
  credits_charged integer not null default 0 check (credits_charged >= 0),
  version integer not null default 1 check (version >= 1),
  parent_frame_id uuid references public.job_frames (id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (job_id, idx, version)
);

create index job_frames_user_idx on public.job_frames (user_id, created_at desc);
create index job_frames_unfinished_idx on public.job_frames (status, created_at) where status in ('queued', 'running');
create index job_frames_generation_image_idx on public.job_frames (generation_image_id) where generation_image_id is not null;
create index job_frames_parent_idx on public.job_frames (parent_frame_id) where parent_frame_id is not null;

alter table public.job_frames enable row level security;
revoke all on table public.job_frames from public, anon, authenticated;
grant select on table public.job_frames to authenticated;
grant all on table public.job_frames to service_role;

create policy job_frames_select_own on public.job_frames
  for select to authenticated
  using ((select auth.uid()) = user_id);

commit;
