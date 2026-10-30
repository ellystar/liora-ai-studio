-- Geri alma: models sütunları
-- DİKKAT: yalnızca bu dosyanın eklediği sütunlar silinir; mevcut sütunlara dokunulmaz.

begin;

alter table public.models
  drop column min_plan,
  drop column age_band,
  drop column note,
  drop column identity_set,
  drop column exclusive,
  drop column review_status,
  drop column reference_path,
  drop column rights_declared_at;

commit;
