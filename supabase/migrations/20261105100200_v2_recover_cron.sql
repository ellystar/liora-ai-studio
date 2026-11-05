-- v2 · Aşama 3 · takılan kare kurtarma zamanlayıcısı (sözleşme K16).
-- pg_cron'a her 5 dakikada v2_recover_frames() çalıştıran bir iş ekler: 10 dakikadır sonuçlanmayan
-- kare en geç 15 dakikada kapanır. Mevcut işlere (cleanup-expired-outputs) dokunmaz.
-- İş, işi ekleyen rolle (postgres) çalışır; fonksiyonun sahibi odur. Komutta anahtar yok.
-- Önce 20261105100100_v2_frame_runs uygulanmış olmalı.
begin;

select cron.schedule('v2-recover-frames', '*/5 * * * *', 'select public.v2_recover_frames()');

commit;
