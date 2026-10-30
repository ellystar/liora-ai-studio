-- v2 · hesap RPC'leri: username_available, complete_signup, update_account.
-- Hepsi auth.uid() ile çağıranı kendisi belirler; başka birinin hesabına yazamaz.
-- Deneme kredisi yalnızca Free paket active = true olunca verilir (Kural 6): geçişe kadar
-- bu RPC çağrılsa bile kimseye kredi yüklenmez. Mevcut müşteriler geçişten önce
-- trial_granted_at dolu olarak eklenir, deneme kredisi almaz.
begin;

-- Kullanıcı adı kuralı tek yerde: biçim ve ayrılmış adlar.
create function public.v2_username_ok(p_username text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_username is not null
    and p_username ~ '^[a-z0-9._]{3,20}$'
    and p_username <> all (array['admin', 'liora', 'atelier', 'support', 'root', 'help', 'salon', 'studio', 'api', 'www']::text[]);
$$;

-- JSON dizisini metin dizisine çevirir; izinli liste verilirse dışındaki değeri reddeder.
create function public.v2_text_array(p_value jsonb, p_allowed text[] default null)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_result text[];
begin
  if p_value is null or jsonb_typeof(p_value) = 'null' then
    return '{}'::text[];
  end if;
  if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) > 32 then
    raise exception 'invalid_answers';
  end if;
  if exists (select 1 from jsonb_array_elements(p_value) e where jsonb_typeof(e) <> 'string') then
    raise exception 'invalid_answers';
  end if;
  select coalesce(array_agg(e), '{}'::text[]) into v_result from jsonb_array_elements_text(p_value) e;
  if p_allowed is not null and not v_result <@ p_allowed then
    raise exception 'invalid_answers';
  end if;
  return v_result;
end;
$$;

-- Tek değerli cevap: izinli listede olmalı, ya da (liste yoksa) kısa bir metin.
create function public.v2_text_answer(p_value jsonb, p_allowed text[] default null, p_max integer default 200)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_text text;
begin
  if p_value is null or jsonb_typeof(p_value) = 'null' then
    return null;
  end if;
  if jsonb_typeof(p_value) <> 'string' then
    raise exception 'invalid_answers';
  end if;
  v_text := p_value #>> '{}';
  if char_length(v_text) > p_max or (p_allowed is not null and not v_text = any (p_allowed)) then
    raise exception 'invalid_answers';
  end if;
  return v_text;
end;
$$;

-- Yazım bitince arayüzden çağrılır; hesap açılmadan önce de çalışır.
create function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.v2_username_ok(p_username)
    and not exists (
      select 1 from public.accounts a
      where a.username = p_username and a.user_id is distinct from auth.uid()
    );
$$;

-- Kayıt sonrası tek işlem: hesap, cevaplar, izinler, deneme kredisi.
-- Hesap zaten varsa kullanıcı adına dokunmaz; cevapları günceller, izinleri ekler (/welcome yolu).
create function public.complete_signup(
  p_username text default null,
  p_brand text default null,
  p_website text default null,
  p_answers jsonb default null,
  p_consents jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_is_new boolean;
  v_trial integer := 0;
  v_consent jsonb;
  v_style_ids constant text[] := array['catalog', 'lookbook', 'editorial', 'lifestyle', 'concept', 'dynamic', 'light', 'detail'];
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if char_length(p_brand) > 120 or char_length(p_website) > 200 then
    raise exception 'invalid_answers';
  end if;

  v_is_new := not exists (select 1 from public.accounts where user_id = v_uid);

  if v_is_new then
    if not public.v2_username_ok(p_username) then
      raise exception 'username_invalid';
    end if;
    if p_consents is null or jsonb_typeof(p_consents) <> 'array' or not exists (
      select 1 from jsonb_array_elements(p_consents) c
      where c ->> 'kind' = 'terms' and (c ->> 'granted') = 'true'
    ) then
      raise exception 'terms_required';
    end if;
    begin
      insert into public.accounts (user_id, username, brand, website)
      values (v_uid, p_username, nullif(p_brand, ''), nullif(p_website, ''));
    exception when unique_violation then
      raise exception 'username_taken';
    end;
  end if;

  if p_answers is not null then
    if jsonb_typeof(p_answers) <> 'object' then
      raise exception 'invalid_answers';
    end if;
    if p_answers ? 'styleParams' and (
      jsonb_typeof(p_answers -> 'styleParams') <> 'object'
      or exists (
        select 1 from jsonb_each(p_answers -> 'styleParams') s
        where s.key <> all (array['shoot', 'pose', 'light', 'frame'])
          or jsonb_typeof(s.value) <> 'string'
          or (s.value #>> '{}') <> all (v_style_ids)
      )
    ) then
      raise exception 'invalid_answers';
    end if;
    insert into public.brand_profiles (
      user_id, shoot_for, brand_count, who, ages, kid_ages, tier, style_ids, style, channels,
      waitlist, job, job_other, why, tools, site_read, prefilled
    ) values (
      v_uid,
      public.v2_text_answer(p_answers -> 'for', array['own', 'employer', 'agency', 'explore']),
      public.v2_text_answer(p_answers -> 'brands', null, 40),
      public.v2_text_array(p_answers -> 'who', array['women', 'men', 'kids']),
      public.v2_text_array(p_answers -> 'ages', array['18-25', '25-35', '35-50', '50+']),
      public.v2_text_array(p_answers -> 'kidAges', array['0-12m', '1-4', '5-11', '12-17']),
      public.v2_text_answer(p_answers -> 'tier', array['daily', 'considered', 'premium', 'luxury']),
      public.v2_text_array(p_answers -> 'style', v_style_ids),
      coalesce(p_answers -> 'styleParams', '{}'::jsonb),
      public.v2_text_array(p_answers -> 'where', array['site', 'social', 'market', 'catalog', 'ads']),
      public.v2_text_answer(p_answers -> 'waitlist', array['beauty', 'jewelry', 'home', 'food', 'else']),
      public.v2_text_answer(p_answers -> 'job', array['designer', 'developer', 'pm', 'photographer', 'content', 'founder', 'student', 'other']),
      public.v2_text_answer(p_answers -> 'jobOther', null, 120),
      public.v2_text_answer(p_answers -> 'why', array['benchmark', 'ideas', 'client', 'team', 'curious']),
      public.v2_text_array(p_answers -> 'tools', array['figma', 'photoshop', 'midjourney', 'flora', 'krea', 'comfy', 'other']),
      public.v2_text_answer(p_answers -> 'read', null, 200),
      public.v2_text_array(p_answers -> 'prefilled')
    )
    on conflict (user_id) do update set
      shoot_for = excluded.shoot_for, brand_count = excluded.brand_count, who = excluded.who,
      ages = excluded.ages, kid_ages = excluded.kid_ages, tier = excluded.tier,
      style_ids = excluded.style_ids, style = excluded.style, channels = excluded.channels,
      waitlist = excluded.waitlist, job = excluded.job, job_other = excluded.job_other,
      why = excluded.why, tools = excluded.tools, site_read = excluded.site_read,
      prefilled = excluded.prefilled;
  end if;

  if p_consents is not null then
    if jsonb_typeof(p_consents) <> 'array' or jsonb_array_length(p_consents) > 8 then
      raise exception 'invalid_consents';
    end if;
    for v_consent in select value from jsonb_array_elements(p_consents) loop
      if jsonb_typeof(v_consent) <> 'object'
        or v_consent ->> 'kind' is null
        or v_consent ->> 'kind' <> all (array['terms', 'news', 'chat', 'partner'])
        or jsonb_typeof(v_consent -> 'granted') is distinct from 'boolean'
        or coalesce(char_length(v_consent ->> 'text_version'), 0) not between 1 and 40
        or (v_consent ? 'company' and char_length(v_consent ->> 'company') > 120)
      then
        raise exception 'invalid_consents';
      end if;
      insert into public.consents (user_id, kind, granted, text_version, source, meta)
      values (
        v_uid,
        v_consent ->> 'kind',
        (v_consent ->> 'granted')::boolean,
        v_consent ->> 'text_version',
        'signup',
        case when v_consent ->> 'kind' = 'partner' and v_consent ? 'company'
          then jsonb_build_object('company', v_consent ->> 'company')
          else '{}'::jsonb end
      );
    end loop;
  end if;

  -- Deneme kredisi: paket açıksa ve daha önce verilmediyse, bir kez.
  select coalesce((select p.trial_credits from public.plans p where p.id = 'explorer' and p.active), 0) into v_trial;
  if v_trial > 0 then
    update public.accounts set trial_granted_at = now()
    where user_id = v_uid and trial_granted_at is null;
    if found then
      perform public.add_credits(v_uid, v_trial, 'trial credits');
    else
      v_trial := 0;
    end if;
  end if;

  return jsonb_build_object('created', v_is_new, 'trial_credits', v_trial);
end;
$$;

-- Hesabın kendi alanları. Boş bırakılan (null) alan değişmez; boş metin alanı temizler.
-- plan ve kredi burada yoktur.
create function public.update_account(
  p_username text default null,
  p_name text default null,
  p_brand text default null,
  p_website text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_username is not null and not public.v2_username_ok(p_username) then
    raise exception 'username_invalid';
  end if;
  if char_length(p_name) > 120 or char_length(p_brand) > 120 or char_length(p_website) > 200 then
    raise exception 'invalid_answers';
  end if;
  begin
    update public.accounts set
      username = coalesce(p_username, username),
      name = case when p_name is null then name else nullif(p_name, '') end,
      brand = case when p_brand is null then brand else nullif(p_brand, '') end,
      website = case when p_website is null then website else nullif(p_website, '') end
    where user_id = v_uid;
  exception when unique_violation then
    raise exception 'username_taken';
  end;
  if not found then
    raise exception 'account_missing';
  end if;
end;
$$;

revoke all on function public.v2_username_ok(text) from public, anon, authenticated;
revoke all on function public.v2_text_array(jsonb, text[]) from public, anon, authenticated;
revoke all on function public.v2_text_answer(jsonb, text[], integer) from public, anon, authenticated;
revoke all on function public.username_available(text) from public, anon, authenticated;
revoke all on function public.complete_signup(text, text, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.update_account(text, text, text, text) from public, anon, authenticated;

grant execute on function public.username_available(text) to anon, authenticated, service_role;
grant execute on function public.complete_signup(text, text, text, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.update_account(text, text, text, text) to authenticated, service_role;

commit;
