-- v2 · models: 8 yeni sütun. Hepsi boş ya da varsayılanlı; MVP'nin okuduğu sütunlar değişmez.
begin;

alter table public.models
  add column min_plan text check (min_plan in ('creator', 'partner', 'enterprise')),
  add column age_band text,
  add column note jsonb,
  add column identity_set text[],
  add column exclusive boolean not null default false,
  add column review_status text check (review_status in ('pending', 'approved', 'declined')),
  add column reference_path text,
  add column rights_declared_at timestamptz;

commit;
