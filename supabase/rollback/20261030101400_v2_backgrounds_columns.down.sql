-- Geri alma: backgrounds sütunları
-- DİKKAT: yalnızca bu dosyanın eklediği sütunlar silinir; mevcut sütunlara dokunulmaz.

begin;

alter table public.backgrounds
  drop column min_plan,
  drop column place,
  drop column example_url,
  drop column style_tags;

commit;
