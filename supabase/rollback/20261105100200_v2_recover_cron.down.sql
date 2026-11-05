-- Geri alma: takılan kare kurtarma zamanlayıcısı
-- Yalnızca v2-recover-frames işi kaldırılır; cleanup-expired-outputs ve diğer işlere dokunulmaz.
-- Fonksiyonlar 20261105100100_v2_frame_runs.down.sql ile ayrıca kaldırılır (önce bu çalıştırılır).

begin;

select cron.unschedule('v2-recover-frames');

commit;
