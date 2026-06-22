create or replace function public.admin_user_id_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  return uid;  -- bulunamazsa null
end;
$$;

revoke all on function public.admin_user_id_by_email(text) from public;
grant execute on function public.admin_user_id_by_email(text) to authenticated;
