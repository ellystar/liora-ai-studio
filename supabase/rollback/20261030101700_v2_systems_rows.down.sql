-- Geri alma: systems satırları
-- Yalnızca bu iki yeni satır silinir; mevcut beş fiyat satırına dokunulmaz.

begin;

delete from public.systems where id in ('cast_studio_try', 'cast_exclusive');

commit;
