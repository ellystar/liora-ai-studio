-- v2 · video_jobs: videonun saklanması. Boş başlar; yalnızca -v2 fonksiyonu yazar.
begin;

alter table public.video_jobs
  add column video_path text,
  add column video_url text;

commit;
