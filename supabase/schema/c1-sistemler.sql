-- ============================================================================
-- C1 · Beş sistem + sunucu tarafı fiyatlandırma
-- Supabase SQL Editor'den elle çalıştırılmak üzere.
--
-- Bloklar sıralı çalıştırılmalı: 1 → 2 → 3. Blok 4 yalnızca doğrulama.
--
-- Edge function değişiklikleri bu SQL'e BAĞIMLI: systems tablosu yokken
-- fiyat okuması başarısız olur ve fonksiyonlar 503 döner. Yani önce bu
-- dosya çalıştırılmalı, sonra fonksiyonlar dağıtılmalı.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- BLOK 1 · systems tablosu
--
-- Sistem, kullanıcının adını gördüğü şey. Stüdyolar (tool) altında çalışan
-- motorlar ve kullanıcıya görünmüyor; bu yüzden iki alan ayrı tutuluyor.
--
-- unit değerleri şemanın geri kalanıyla tutarlı olsun diye İngilizce:
--   'frame' → fiyat kare başına, toplam = price × üretilen kare
--   'job'   → fiyat iş başına, kare sayısından bağımsız
-- ────────────────────────────────────────────────────────────────────────────

create table public.systems (
  id         text primary key,
  name       text        not null,
  unit       text        not null check (unit in ('frame', 'job')),
  price      integer     not null check (price > 0),
  sort       integer     not null default 0,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now()
);

insert into public.systems (id, name, unit, price, sort) values
  ('flat_to_form',      'Flat to Form',             'frame', 1, 1),
  ('ghost_to_campaign', 'From Ghost to Campaign',   'frame', 1, 2),
  ('rebuild_shoot',     'Rebuild the Shoot',        'frame', 2, 3),
  ('many_markets',      'One Product, Many Markets','frame', 1, 4),
  ('product_video',     '180° Product Video',       'job',   4, 5);

-- RLS. Edge function'lar service role ile okuduğu için politikalara takılmaz;
-- bunlar yalnızca istemci okuması için. Kullanıcı verisi içermiyor ama yine de
-- anon'a açılmıyor — Bulgu 1'deki dersi tekrarlamayalım.
alter table public.systems enable row level security;

create policy systems_select_active on public.systems
  for select to authenticated
  using (is_active);

create policy systems_admin_all on public.systems
  for all to authenticated
  using (is_admin()) with check (is_admin());


-- ────────────────────────────────────────────────────────────────────────────
-- BLOK 2 · generations.system
--
-- tool'a dokunulmuyor. tool hangi motorun çalıştığını, system ürün
-- taksonomisini tutuyor; ikisi farklı hızda değişir.
--
-- NULL bilerek serbest: pose_generator ve edit_photo bir sistemin parçası
-- değil, o üretimlerde alan boş kalacak.
-- ────────────────────────────────────────────────────────────────────────────

alter table public.generations
  add column system text references public.systems(id);

create index generations_system_idx
  on public.generations (system)
  where system is not null;


-- ────────────────────────────────────────────────────────────────────────────
-- BLOK 3 · Geçmişi doldur
--
-- ecom_studio ile üretilenlerin bir kısmı aslında Rebuild the Shoot ama
-- kayıttan ayırt edilemiyor. Hepsi ghost_to_campaign olarak dolduruluyor —
-- ayırt edilemeyen geçmişi tahminle bölmek istatistiği kirletir.
-- ────────────────────────────────────────────────────────────────────────────

update public.generations set system = 'flat_to_form'
  where tool = 'flat_to_ghost'  and system is null;

update public.generations set system = 'ghost_to_campaign'
  where tool = 'ecom_studio'    and system is null;

update public.generations set system = 'many_markets'
  where tool = 'style_transfer' and system is null;

update public.generations set system = 'product_video'
  where tool = 'ai_video'       and system is null;

-- pose_generator ve edit_photo bilerek NULL bırakılıyor.


-- ────────────────────────────────────────────────────────────────────────────
-- BLOK 4 · Doğrulama — hiçbir şey yazmaz
-- ────────────────────────────────────────────────────────────────────────────

-- 4a · Eşleme tuttu mu? pose_generator ve edit_photo satırlarında system
--      boş görünmeli, diğerlerinde dolu.
select
  tool,
  system,
  count(*) as kayit
from public.generations
group by tool, system
order by tool, system nulls first;

-- 4b · Fiyat tablosu
select id, name, unit, price, is_active from public.systems order by sort;
