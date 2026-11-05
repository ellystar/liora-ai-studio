-- v2 · Aşama 3 · iş açma, kare kapanışı ve takılan kare kurtarma (sözleşme K15, K16).
-- Yalnızca ekleme: dört fonksiyon. Mevcut tablo, sütun, kısıt ve kurallara dokunmaz.
-- Dört fonksiyonu da yalnızca service_role çağırabilir (v2 edge function'ları ve pg_cron).
-- Kare, iş sayaçları, iade ve inceleme kaydı tek işlemde güncellenir; aynı kare iki kez
-- kapanamaz, bu yüzden iade de kare başına en fazla bir kez yapılır.
-- Aynı kullanıcı aynı anda birden çok iş çalıştırabilir (prototip böyle; sözleşme: Bilinen
-- boşluklar, "Rezervasyon yok"). Bakiye kontrolü start-run-v2'de, açık işlerin kareleri dahil.
begin;

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

  insert into public.jobs (user_id, setup_id, flow, title, status, planned, params, started_at)
  values (p_user_id, p_setup_id, p_flow, coalesce(p_title, ''), 'running',
          cardinality(p_pose_keys), coalesce(p_params, '{}'::jsonb), now())
  returning id into v_job;

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

-- Kareyi kendi kaydına göre kapatır (K15, K16). Kredinin doğrusu tek yerde belirlenir:
-- run-frame-v2 motordan kesin bir yanıt aldıktan sonra, v2_recover_frames de takılan
-- kareler için bunu çağırır. Yanıttaki creditsCharged'a güvenilmez; kareye bağlı kayıt
-- aranır (generations.params.poses içinde karenin kimliği) ve durumlar ayrılır:
--   1  kayıt (kredi düşmüş) + görsel kaydı -> done, yeni ücret yok
--   1b görsel kaydı yok ama dosya depoda   -> done, kredi kayıttan (kayıt yoksa işin fiyatı)
--      run-frame-v2'nin kopyası (outputs/<kullanıcı>/v2/frames/<kare>.<uzantı>) ya da motorun
--      yükleyip kaydını yazamadığı dosya (outputs/<kullanıcı>/<kayıt>/0.<uzantı>). Kopya yalnızca
--      motor başarılı yanıt verdiyse yazılır; o yanıt kredi düşmeden dönmez.
--   2  kayıt (kredi düşmüş), görsel ne kayıtta ne depoda -> failed (image_lost), düşen kredi iade
--   2b kayıt var, kredi düşmemiş           -> failed (p_error_code ya da generation_failed), ücret yok
--   3  kayıt yok, dosya yok                -> failed (p_error_code ya da timeout); kare açıldıktan
--      sonraki 10 dakikada ecom_studio kredi satırı varsa "ücret alınmadı" denmez:
--      failed (charge_unclear) ve iade incelemesine düşer
-- İade yalnızca görsel gerçekten elde yoksa yapılır. Kare zaten kapanmışsa hiçbir şey
-- yapmaz; iade bu yüzden kare başına en fazla bir kez.
-- p_error_code: motorun yanıtındaki hata (ör. model_busy); takılan karede boş.
-- İlk sürüm yalnızca Ghost'tan Kampanyaya (campaign -> generate-ecom, ecom_studio).
create function public.v2_reconcile_frame(p_frame_id uuid, p_error_code text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tool constant text := 'ecom_studio';
  v_window constant interval := interval '10 minutes';
  v_user uuid;
  v_created timestamptz;
  v_status text;
  v_flow text;
  v_price integer;
  v_gen_id uuid;
  v_gen_credits integer;
  v_img_id uuid;
  v_img_path text;
  v_copy text;
  v_outcome text;
begin
  -- Fiyat işin anlık görüntüsünden (start-run-v2 yazar). Bozuksa null; dönüştürme hatası
  -- kurtarma turunun tamamını düşürmesin.
  select f.user_id, f.created_at, f.status, j.flow,
         case when j.params ->> 'price' ~ '^[0-9]{1,6}$' then (j.params ->> 'price')::integer end
  into v_user, v_created, v_status, v_flow, v_price
  from public.job_frames f
  join public.jobs j on j.id = f.job_id
  where f.id = p_frame_id
  for update of f;
  if v_user is null then
    raise exception 'frame_not_found';
  end if;
  if v_status not in ('queued', 'running') then
    return jsonb_build_object('applied', false, 'frame_status', v_status);
  end if;
  if v_flow <> 'campaign' then
    raise exception 'flow_not_supported';
  end if;

  select g.id, g.credits_charged into v_gen_id, v_gen_credits
  from public.generations g
  where g.user_id = v_user
    and g.tool = v_tool
    and g.params -> 'poses' ? p_frame_id::text
    and g.created_at >= v_created
  order by g.created_at
  limit 1;

  if v_gen_id is not null then
    select i.id, i.storage_path into v_img_id, v_img_path
    from public.generation_images i
    where i.generation_id = v_gen_id and i.deleted_at is null
    order by i.created_at
    limit 1;
  end if;

  -- Görsel kaydı yoksa depoda dosya var mı (silinmiş ya da arşivlenmiş dosya sayılmaz).
  -- Yollar kare sahibinin klasöründe; başkasının dosyası eşleşemez.
  if v_img_id is null then
    select o.name into v_copy
    from storage.objects o
    where o.bucket_id = 'outputs'
      and o.archived_at is null
      and not o.is_delete_marker
      and o.name in (
        select v_user::text || '/v2/frames/' || p_frame_id::text || '.' || e.x
        from unnest(array['png', 'jpg', 'webp']) as e(x)
        union all
        select v_user::text || '/' || v_gen_id::text || '/0.' || e.x
        from unnest(array['png', 'jpg', 'webp']) as e(x)
        where v_gen_id is not null
      )
    order by o.created_at
    limit 1;
  end if;

  if v_gen_id is not null and v_gen_credits > 0 and v_img_id is not null then
    -- 1
    perform public.v2_finish_frame(p_frame_id, 'done', v_gen_credits, v_img_id, v_img_path, null);
    v_outcome := 'done';
  elsif v_copy is not null then
    -- 1b
    perform public.v2_finish_frame(p_frame_id, 'done', coalesce(v_gen_credits, v_price, 0), null, v_copy, null);
    v_outcome := 'done';
  elsif v_gen_id is not null and v_gen_credits > 0 then
    -- 2. İade yalnızca kare bu çağrıda kapandıysa. Birinci güvence yukarıdaki kilit ve durum
    -- kontrolü; bu ikincisi: kare kapanmadıysa iade yok.
    if not coalesce((public.v2_finish_frame(p_frame_id, 'failed', 0, null, null, 'image_lost') ->> 'applied')::boolean, false) then
      return jsonb_build_object('applied', false);
    end if;
    perform public.refund_credits(v_user, v_gen_credits, v_tool);
    v_outcome := 'refunded';
  elsif v_gen_id is not null then
    -- 2b
    perform public.v2_finish_frame(p_frame_id, 'failed', 0, null, null, coalesce(p_error_code, 'generation_failed'));
    v_outcome := 'failed';
  elsif exists (
    select 1 from public.credit_transactions t
    where t.user_id = v_user
      and t.tool = v_tool
      and t.type = 'usage'
      and t.created_at >= v_created
      and t.created_at < v_created + v_window
  ) then
    -- 3, kredi satırı var
    perform public.v2_finish_frame(p_frame_id, 'failed', 0, null, null, 'charge_unclear');
    insert into public.frame_reviews (frame_id, user_id, reasons, note)
    values (p_frame_id, v_user, array['other']::text[],
            'Otomatik: karenin kaydı bulunamadı; kare açıldıktan sonraki 10 dakikada ecom_studio kredi satırı var.')
    on conflict (frame_id) do nothing;
    v_outcome := 'review';
  else
    -- 3, kredi satırı yok: ücret alınmamış
    perform public.v2_finish_frame(p_frame_id, 'failed', 0, null, null, coalesce(p_error_code, 'timeout'));
    v_outcome := 'failed';
  end if;

  return jsonb_build_object('applied', true, 'outcome', v_outcome);
end;
$$;

-- Takılan kareleri kurtarır (K16): yeniden üretmez, her kareyi v2_reconcile_frame ile kapatır.
-- p_stale 10 dakikadan kısa olamaz: fonksiyon süre sınırından (400 sn) uzun olmalı ki
-- kurtarılan kare için çalışan bir çağrı kalmamış olsun. pg_cron bunu doğrudan çağırır.
create function public.v2_recover_frames(p_stale interval default interval '10 minutes')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_frame record;
  v_outcome text;
  v_done integer := 0;
  v_refunded integer := 0;
  v_failed integer := 0;
  v_review integer := 0;
begin
  if p_stale is null or p_stale < interval '10 minutes' then
    raise exception 'stale_too_short';
  end if;

  for v_frame in
    select f.id
    from public.job_frames f
    join public.jobs j on j.id = f.job_id
    where f.status in ('queued', 'running')
      and f.created_at < now() - p_stale
      and j.flow = 'campaign'
    order by f.created_at
    for update of f skip locked
  loop
    v_outcome := public.v2_reconcile_frame(v_frame.id, null) ->> 'outcome';
    if v_outcome = 'done' then v_done := v_done + 1;
    elsif v_outcome = 'refunded' then v_refunded := v_refunded + 1;
    elsif v_outcome = 'review' then v_review := v_review + 1;
    else v_failed := v_failed + 1;
    end if;
  end loop;

  return jsonb_build_object('done', v_done, 'refunded', v_refunded, 'failed', v_failed, 'review', v_review);
end;
$$;

revoke all on function public.v2_open_job(uuid, text, text, jsonb, text[], uuid) from public, anon, authenticated;
revoke all on function public.v2_finish_frame(uuid, text, integer, uuid, text, text) from public, anon, authenticated;
revoke all on function public.v2_reconcile_frame(uuid, text) from public, anon, authenticated;
revoke all on function public.v2_recover_frames(interval) from public, anon, authenticated;

grant execute on function public.v2_open_job(uuid, text, text, jsonb, text[], uuid) to service_role;
grant execute on function public.v2_finish_frame(uuid, text, integer, uuid, text, text) to service_role;
grant execute on function public.v2_reconcile_frame(uuid, text) to service_role;
grant execute on function public.v2_recover_frames(interval) to service_role;

commit;
