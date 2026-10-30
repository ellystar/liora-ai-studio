-- v2 · backgrounds: 4 yeni sütun. Hepsi boş; MVP etkilenmez.
begin;

alter table public.backgrounds
  add column min_plan text check (min_plan in ('creator', 'partner', 'enterprise')),
  add column place text check (place in ('studio', 'outdoor')),
  add column example_url text,
  add column style_tags text[];

commit;
