-- Geri alma: iş açma, kare kapanışı ve kurtarma fonksiyonları
-- Fonksiyonlar ve indeks silinir; jobs, job_frames, frame_reviews ve kredi defterindeki veriye dokunulmaz.
-- pg_cron'a kurtarma işi eklendiyse önce o kaldırılır: select cron.unschedule('v2-recover-frames');

begin;

drop function public.v2_recover_frames(interval);
drop function public.v2_finish_frame(uuid, text, integer, uuid, text, text);
drop function public.v2_open_job(uuid, text, text, jsonb, text[], uuid);
drop index public.jobs_one_active_per_user;

commit;
