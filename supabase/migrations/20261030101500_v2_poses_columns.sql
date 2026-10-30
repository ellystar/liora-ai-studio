-- v2 · poses: paket kilidi. Boş = herkese açık; MVP etkilenmez.
begin;

alter table public.poses
  add column min_plan text check (min_plan in ('creator', 'partner', 'enterprise'));

commit;
