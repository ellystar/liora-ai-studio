-- v2 · Aşama 3 · iş açma, kare kapanışı ve takılan kare kurtarma (sözleşme K15, K16).
-- Yalnızca ekleme: bir indeks ve üç fonksiyon. Mevcut tablo, sütun, kısıt ve kurallara dokunmaz.
-- Üç fonksiyonu da yalnızca service_role çağırabilir (v2 edge function'ları ve pg_cron).
-- Kare, iş sayaçları, iade ve inceleme kaydı tek işlemde güncellenir; aynı kare iki kez
-- kapanamaz, bu yüzden iade de kare başına en fazla bir kez yapılır.
begin;

-- Aynı kullanıcı için aynı anda tek iş (sözleşme: Bilinen boşluklar, "Rezervasyon yok").
create unique index jobs_one_active_per_user on public.jobs (user_id)
  where status in ('queued', 'running');

-- İşi ve karelerini açar. Kareler pose_keys sırasıyla idx 0, 1, 2... alır.
-- Fiyat ve bakiye kontrolü çağıran edge function'da (start-run-v2); burada yalnızca kayıt.
create function public.v2_open_job(
  p_user_id uuid,
  p_flow text,
  p_title text,
  p_params jsonb,
  p_pose_keys text[],
  p_setup_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job uuid;
  v_frames jsonb;
begin
  if p_user_id is null then
    raise exception 'user_required';
  end if;
  if p_pose_keys is null or cardinality(p_pose_keys) = 0 then
    raise exception 'no_frames';
  end if;
  if p_setup_id is not null
     and not exists (select 1 from public.setups s where s.id = p_setup_id and s.user_id = p_user_id) then
    raise exception 'setup_not_found';
  end if;

  begin
    insert into public.jobs (user_id, setup_id, flow, title, status, planned, params, started_at)
    values (p_user_id, p_setup_id, p_flow, coalesce(p_title, ''), 'running',
            cardinality(p_pose_keys), coalesce(p_params, '{}'::jsonb), now())
    returning id into v_job;
  exception when unique_violation then
    raise exception 'job_already_running';
  end;

  with ins as (
    insert into public.job_frames (job_id, user_id, idx, pose_key)
    select v_job, p_user_id, (k.ord - 1)::integer, k.key
    from unnest(p_pose_keys) with ordinality as k(key, ord)
    returning id, idx, pose_key
  )
  select jsonb_agg(jsonb_build_object('id', ins.id, 'idx', ins.idx, 'pose_key', ins.pose_key) order by ins.idx)
  into v_frames
  from ins;

  return jsonb_build_object('job_id', v_job, 'frames', v_frames);
end;
$$;

-- Kareyi kapatır, iş sayaçlarını günceller; son kare kapanınca işi kapatır.
-- Kare zaten kapanmışsa hiçbir şey yapmaz (applied = false): ikinci çağrı ne sayacı ne krediyi değiştirir.
-- p_credits: o kare için kullanıcıdan düşen net kredi (iade edildiyse 0).
create function public.v2_finish_frame(
  p_frame_id uuid,
  p_status text,
  p_credits integer default 0,
  p_generation_image_id uuid default null,
  p_storage_path text default null,
  p_error_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job uuid;
  v_status text;
  v_done integer;
  v_job_status text;
begin
  if p_status is null or p_status not in ('done', 'failed') then
    raise exception 'invalid_status';
  end if;
  if coalesce(p_credits, 0) < 0 then
    raise exception 'invalid_credits';
  end if;

  select f.job_id, f.status into v_job, v_status
  from public.job_frames f
  where f.id = p_frame_id
  for update;
  if v_job is null then
    raise exception 'frame_not_found';
  end if;
  if v_status not in ('queued', 'running') then
    return jsonb_build_object('applied', false, 'frame_status', v_status);
  end if;

  update public.job_frames set
    status = p_status,
    credits_charged = coalesce(p_credits, 0),
    generation_image_id = p_generation_image_id,
    storage_path = p_storage_path,
    error_code = case when p_status = 'failed' then coalesce(p_error_code, 'generation_failed') end,
    finished_at = now()
  where id = p_frame_id;

  update public.jobs set
    done = done + (p_status = 'done')::integer,
    failed = failed + (p_status = 'failed')::integer,
    credits_spent = credits_spent + coalesce(p_credits, 0),
    cover_path = coalesce(cover_path, case when p_status = 'done' then p_storage_path end)
  where id = v_job
  returning done, status into v_done, v_job_status;

  if not exists (
    select 1 from public.job_frames f where f.job_id = v_job and f.status in ('queued', 'running')
  ) then
    update public.jobs set
      status = case when v_done > 0 then 'done' else 'failed' end,
      finished_at = now(),
      expires_at = now() + interval '7 days'
    where id = v_job and status in ('queued', 'running')
    returning status into v_job_status;
  end if;

  return jsonb_build_object('applied', true, 'job_id', v_job, 'job_status', v_job_status);
end;
$$;

-- Takılan kareleri kurtarır (K16). Yeniden üretmez; kareye bağlı kaydı arar (K15:
-- generations.params.poses içinde karenin kimliği) ve dört durumu ayırır:
--   1  kayıt (kredi düşmüş) + görsel   -> done, yeni ücret yok
--   2  kayıt (kredi düşmüş), görsel yok -> failed (image_lost), düşen kredi iade
--   2b kayıt var, kredi düşmemiş        -> failed (generation_failed), ücret yok
--   3  kayıt yok                       -> failed (timeout); aynı dakikalarda ecom_studio
--      kredi satırı varsa failed (charge_unclear) ve iade incelemesine düşer
-- p_stale 10 dakikadan kısa olamaz: fonksiyon süre sınırından (400 sn) uzun olmalı ki
-- kurtarılan kare için çalışan bir çağrı kalmamış olsun.
-- İlk sürüm yalnızca Ghost'tan Kampanyaya (campaign -> generate-ecom, ecom_studio).
create function public.v2_recover_frames(p_stale interval default interval '10 minutes')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_frame record;
  v_tool constant text := 'ecom_studio';
  v_gen_id uuid;
  v_gen_credits integer;
  v_img_id uuid;
  v_img_path text;
  v_done integer := 0;
  v_refunded integer := 0;
  v_failed integer := 0;
  v_review integer := 0;
begin
  if p_stale is null or p_stale < interval '10 minutes' then
    raise exception 'stale_too_short';
  end if;

  for v_frame in
    select f.id, f.user_id, f.created_at
    from public.job_frames f
    join public.jobs j on j.id = f.job_id
    where f.status in ('queued', 'running')
      and f.created_at < now() - p_stale
      and j.flow = 'campaign'
    order by f.created_at
    for update of f skip locked
  loop
    v_gen_id := null;
    v_gen_credits := null;
    v_img_id := null;
    v_img_path := null;

    select g.id, g.credits_charged into v_gen_id, v_gen_credits
    from public.generations g
    where g.user_id = v_frame.user_id
      and g.tool = v_tool
      and g.params -> 'poses' ? v_frame.id::text
      and g.created_at >= v_frame.created_at
    order by g.created_at
    limit 1;

    if v_gen_id is not null then
      select i.id, i.storage_path into v_img_id, v_img_path
      from public.generation_images i
      where i.generation_id = v_gen_id and i.deleted_at is null
      order by i.created_at
      limit 1;
    end if;

    if v_gen_id is not null and v_gen_credits > 0 and v_img_id is not null then
      -- 1
      perform public.v2_finish_frame(v_frame.id, 'done', v_gen_credits, v_img_id, v_img_path, null);
      v_done := v_done + 1;
    elsif v_gen_id is not null and v_gen_credits > 0 then
      -- 2
      perform public.v2_finish_frame(v_frame.id, 'failed', 0, null, null, 'image_lost');
      perform public.refund_credits(v_frame.user_id, v_gen_credits, v_tool);
      v_refunded := v_refunded + 1;
    elsif v_gen_id is not null then
      -- 2b
      perform public.v2_finish_frame(v_frame.id, 'failed', 0, null, null, 'generation_failed');
      v_failed := v_failed + 1;
    elsif exists (
      select 1 from public.credit_transactions t
      where t.user_id = v_frame.user_id
        and t.tool = v_tool
        and t.type = 'usage'
        and t.created_at >= v_frame.created_at
        and t.created_at < v_frame.created_at + p_stale
    ) then
      -- 3, kredi satırı var: "ücret alınmadı" denmez
      perform public.v2_finish_frame(v_frame.id, 'failed', 0, null, null, 'charge_unclear');
      insert into public.frame_reviews (frame_id, user_id, reasons, note)
      values (v_frame.id, v_frame.user_id, array['other']::text[],
              'Otomatik: kare 10 dakikada sonuçlanmadı ve kaydı bulunamadı; aynı dakikalarda ecom_studio kredi satırı var.')
      on conflict (frame_id) do nothing;
      v_review := v_review + 1;
    else
      -- 3, kredi satırı yok: ücret alınmamış
      perform public.v2_finish_frame(v_frame.id, 'failed', 0, null, null, 'timeout');
      v_failed := v_failed + 1;
    end if;
  end loop;

  return jsonb_build_object('done', v_done, 'refunded', v_refunded, 'failed', v_failed, 'review', v_review);
end;
$$;

revoke all on function public.v2_open_job(uuid, text, text, jsonb, text[], uuid) from public, anon, authenticated;
revoke all on function public.v2_finish_frame(uuid, text, integer, uuid, text, text) from public, anon, authenticated;
revoke all on function public.v2_recover_frames(interval) from public, anon, authenticated;

grant execute on function public.v2_open_job(uuid, text, text, jsonb, text[], uuid) to service_role;
grant execute on function public.v2_finish_frame(uuid, text, integer, uuid, text, text) to service_role;
grant execute on function public.v2_recover_frames(interval) to service_role;

commit;
