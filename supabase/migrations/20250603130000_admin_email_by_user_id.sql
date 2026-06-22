create or replace function public.admin_email_by_user_id(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare em text;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  select email into em from auth.users where id = p_user_id limit 1;
  return em;
end;
$$;

revoke all on function public.admin_email_by_user_id(uuid) from public;
grant execute on function public.admin_email_by_user_id(uuid) to authenticated;
