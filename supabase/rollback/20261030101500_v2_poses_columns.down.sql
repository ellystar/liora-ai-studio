-- Geri alma: poses sütunu
-- DİKKAT: yalnızca bu dosyanın eklediği sütunlar silinir; mevcut sütunlara dokunulmaz.

begin;

alter table public.poses drop column min_plan;

commit;
