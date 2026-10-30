-- v2 · systems: Cast Studio fiyatları. Kapalı girilir, Aşama 5'te açılır.
-- MVP ve mevcut fonksiyonlar bu tabloyu yalnızca kimlikle okuduğu için bu satırları görmez.
begin;

insert into public.systems (id, name, unit, price, sort, is_active) values
  ('cast_studio_try', 'Cast Studio try', 'job', 1, 6, false),
  ('cast_exclusive', 'Cast exclusivity', 'job', 30, 7, false);

commit;
