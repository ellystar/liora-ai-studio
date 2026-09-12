-- ============================================================================
-- BEKLEYEN DÜZELTMELER
-- Supabase SQL Editor'den elle çalıştırılmak üzere. 11 Eylül 2026.
--
-- Bu dosya migration DEĞİLDİR. Şema hâlâ yalnızca uzak projede yaşıyor;
-- burası neyin neden çalıştırıldığının kaydı. Migration'a çevirmek ayrı iş.
--
-- Blok 1 ve Blok 2 birbirinden bağımsız, sırası önemli değil.
-- Blok 2 içindeki iki adım ise sıralı: önce CHECK genişletilmeli.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- BLOK 1 · Sızıntı  🔴
--
-- backgrounds üzerinde iki PERMISSIVE SELECT politikası var ve OR'lanıyor.
-- Bunlardan biri TO public (yani anon dahil) ve yalnızca is_active arıyor;
-- is_active varsayılanı true, uygulama kullanıcı kaydında bu alanı hiç set
-- etmiyor. Sonuç: anon anahtarıyla herkes başka kullanıcıların prompt'larını
-- okuyabiliyor.
--
-- Silmek yeterli ve doğru olan: geriye kalan backgrounds_select_visible
-- (TO authenticated) preset'leri ve kullanıcının kendi kayıtlarını zaten
-- kapsıyor. Daraltılmış ikinci bir politika yazmak işe yaramazdı — permissive
-- politikalar OR'landığı için daraltma hiçbir şeyi gizlemez.
-- ────────────────────────────────────────────────────────────────────────────

-- 1a · ÖNCE çalıştır. "sizan" > 0 bekleniyor.
begin;
set local role anon;
select
  count(*) filter (where owner_id is not null) as sizan_kullanici_arkaplani,
  count(*)                                     as anonun_gorebildigi_toplam
from public.backgrounds;
rollback;

-- 1b · Düzeltme.
drop policy backgrounds_select_active on public.backgrounds;

-- 1c · SONRA çalıştır. İki sayı da 0 dönmeli.
--      (anon artık hiçbir politikaya uymuyor, RLS tüm satırları eliyor)
begin;
set local role anon;
select
  count(*) filter (where owner_id is not null) as sizan_kullanici_arkaplani,
  count(*)                                     as anonun_gorebildigi_toplam
from public.backgrounds;
rollback;

-- NOT: Pasif preset'lerin gizlenmesi ayrı bir karar ve bu blokta yok.
-- backgrounds_select_visible'da is_active kontrolü olmadığı için
-- is_active = false olan preset'ler oturum açmış kullanıcılara görünmeye
-- devam edecek — bu düzeltmeden önce de böyleydi, değişen bir şey yok.


-- ────────────────────────────────────────────────────────────────────────────
-- BLOK 2 · Video üretimleri kayıt dışı  🟠
--
-- generations_tool_check kısıtı 'ai_video' değerini kabul etmiyor, ama
-- generate-video-status o değerle insert yapıyor. Kod dönen hatayı kontrol
-- etmediği için insert sessizce düşüyor: kredi düşüyor, video çalışıyor,
-- üretim kaydı hiç oluşmuyor.
--
-- Adım 2a kısıtı genişletiyor. Adım 2b geçmişi geri dolduruyor ve ayrı
-- çalıştırılmalı — 2a olmadan 2b kısıta takılır.
-- ────────────────────────────────────────────────────────────────────────────

-- 2a · Kısıtı genişlet. Kısıt adı kisitlar.csv'den birebir alındı.
--      Mevcut satırların hepsi yeni kısıtı zaten sağlıyor (küme genişliyor),
--      bu yüzden doğrulama taraması sorunsuz geçer.
alter table public.generations
  drop constraint generations_tool_check;

alter table public.generations
  add constraint generations_tool_check
  check (tool = any (array[
    'ecom_studio',
    'pose_generator',
    'flat_to_ghost',
    'edit_photo',
    'style_transfer',
    'ai_video'
  ]));


-- ────────────────────────────────────────────────────────────────────────────
-- 2b · GEÇMİŞİ GERİ DOLDUR — ayrı adım, 2a'dan sonra.
-- ────────────────────────────────────────────────────────────────────────────

-- 2b-i · Önce ne ekleneceğine bak. Hiçbir şey yazmaz.
select count(*) as eklenecek_kayit
from public.video_jobs
where status = 'succeeded' and credits_charged;

-- 2b-ii · Geri doldur.
--         params içindeki backfill_video_job_id iki işe yarıyor: hangi işten
--         geldiğini kaydediyor ve sorguyu tekrar çalıştırırsan kopya
--         oluşmasını engelliyor.
insert into public.generations
  (user_id, tool, status, credits_charged, image_count, params, created_at)
select
  vj.user_id,
  'ai_video',
  'success',
  vj.credits_cost,
  1,
  jsonb_build_object(
    'resolution',            vj.resolution,
    'duration',              vj.duration,
    'backfill_video_job_id', vj.id
  ),
  vj.created_at
from public.video_jobs vj
where vj.status = 'succeeded'
  and vj.credits_charged
  and not exists (
    select 1
    from public.generations g
    where g.tool = 'ai_video'
      and g.params ->> 'backfill_video_job_id' = vj.id::text
  );

-- 2b-iii · Doğrula. Üstteki "eklenecek_kayit" ile aynı sayı dönmeli.
select count(*) as ai_video_kaydi
from public.generations
where tool = 'ai_video';

-- Başarısız video işleri bilerek dahil edilmedi: kredi harcamadılar ve
-- geçmişe hata kaydı eklemek istatistikleri kirletir. İstenirse aynı sorgu
-- status='failed', credits_charged=0, image_count=0 ile tekrarlanabilir.


-- ────────────────────────────────────────────────────────────────────────────
-- C1'E NOT — kod tarafı, burada çözülmüyor
--
-- generate-video-status içindeki iki generations insert'i de dönen hatayı
-- kontrol etmiyor:
--
--     await admin.from('generations').insert({ ... })
--
-- supabase-js hata fırlatmaz, { error } döndürür. Bu yüzden Bulgu 4 aylarca
-- sessiz kaldı. Blok 2 bugünkü sorunu kapatıyor ama aynı şey tekrar olursa
-- yine fark edilmez. C1'de bu iki çağrının (ve aynı dosyadaki video_jobs
-- update'lerinin) dönüş değeri kontrol edilip en azından console.error'a
-- düşürülmeli.
-- ────────────────────────────────────────────────────────────────────────────
