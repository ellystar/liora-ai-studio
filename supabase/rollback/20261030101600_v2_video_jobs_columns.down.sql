-- Geri alma: video_jobs sütunları
-- DİKKAT: yalnızca bu dosyanın eklediği sütunlar silinir; mevcut sütunlara dokunulmaz.

begin;

alter table public.video_jobs
  drop column video_path,
  drop column video_url;

commit;
