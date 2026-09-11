# Veritabanı şeması — okunabilir özet

Kaynak: Supabase panelinden alınan CSV dökümü, 11 Eylül 2026.
Proje referansı `teemolajohctzejbwbrj`. Ham dosyalar bu klasörde:
`tablolar.csv`, `rls.csv`, `fonksiyonlar.csv`, `baglar.csv`.

Bu bir **anlık görüntüdür, migration değildir.** Şema hâlâ yalnızca uzak
Supabase projesinde yaşıyor; buradaki dosyalar onu okumak için var, ondan
üretmek için değil. Şemayı migration'a çevirmek ayrı bir iş.

> ⚠️ İki CSV eksik geldi ve bir güvenlik sorusu açık. Aşağıda
> [Eksikler](#eksikler-ve-panelden-alınması-gerekenler) bölümüne bakın.

---

## Tablolar — 14 tane, dört öbek

### 1 · Kimlik ve kredi

**`profiles`** — `auth.users` ile bire bir. Kullanıcı kaydolunca
`handle_new_user` trigger'ı otomatik oluşturuyor.

| kolon | tip | not |
|---|---|---|
| `id` | uuid | PK, `auth.users.id` |
| `email`, `full_name` | text | |
| `credits` | integer | **kredi bakiyesi**, varsayılan 0 |
| `role` | text | varsayılan `user`; `admin` yetkiyi açıyor |
| `preferred_language` | text | varsayılan `tr` |
| `created_at`, `updated_at` | timestamptz | |

**`credit_transactions`** — kredi defteri. Her hareket buraya düşüyor.
`amount` pozitif (yükleme/iade) veya negatif (kullanım), `type` alanı
`topup` / `usage` / `refund`, `tool` hangi stüdyo olduğunu tutuyor.

### 2 · Üretim kaydı

**`generations`** — her üretim çalışması bir satır. `tool`, `status`
(varsayılan `pending`), `credits_charged`, `image_count`, `params` (jsonb),
`error`.

**`generation_images`** — üretilen görseller. Dikkat çeken kolon:

| kolon | tip | not |
|---|---|---|
| `storage_path` | text | Supabase Storage yolu |
| `expires_at` | timestamptz | **varsayılan `now() + 7 gün`** |
| `deleted_at` | timestamptz | yumuşak silme |

Yedi günlük saklama süresi gizlilik politikasında da yazıyor ve
`cleanup-expired` edge function'ı bunu uyguluyor.

**`downloads`** — kullanıcı bir görseli indirdiğinde iz bırakıyor.

**`video_jobs`** — Kling video üretimi asenkron olduğu için ayrı kuyruk:
`provider_task_id`, `status`, `resolution`, `duration`, `credits_cost`,
`credits_charged` (boolean — çift ücretlendirmeyi engelliyor), `error_code`.

### 3 · Katalog (admin yönetiyor, kullanıcı seçiyor)

| tablo | ne | kullanıcı ekleyebilir mi |
|---|---|---|
| `models` | manken görselleri | evet (`source='user'`) |
| `poses` | poz presetleri + `shot_type`, `direction`, `category` | hayır |
| `backgrounds` | arkaplan presetleri + prompt | evet (`source='user'`) |
| `styles` | stil referansları | evet (`source='user'`) |
| `style_categories` | stillerin gruplaması | hayır |

`models`, `backgrounds` ve `styles` aynı kalıbı paylaşıyor: `owner_id` null
ise preset, dolu ise o kullanıcının kendi yüklediği kayıt.

### 4 · Tercihler

`model_favorites` ve `pose_favorites` — `(user_id, model_id)` /
`(user_id, pose_id)` çiftleri.

---

## Kredi mantığı — üç fonksiyon, hepsi `SECURITY DEFINER`

Kredi bakiyesini **hiçbir istemci doğrudan değiştiremiyor**. `profiles`
üzerinde UPDATE politikası yok; bakiye yalnızca şu üç fonksiyonla değişiyor
ve üçü de aynı anda `credit_transactions`'a kayıt düşüyor:

| fonksiyon | ne yapar |
|---|---|
| `deduct_credits(user, amount, tool)` | Bakiyeyi `for update` ile kilitler, yetersizse `insufficient_credits` fırlatır, düşer, `usage` kaydı atar. |
| `add_credits(user, amount, description)` | Yükleme. `topup` kaydı. |
| `refund_credits(user, amount, tool)` | Başarısız üretim iadesi. `refund` kaydı. |

Bu iyi kurulmuş: yarış koşulu `for update` ile kapatılmış, defter ile bakiye
aynı işlemde güncelleniyor.

Diğer fonksiyonlar: `is_admin()` (RLS politikalarının tamamı buna dayanıyor),
`handle_new_user()` (kayıt trigger'ı), `set_updated_at()` (trigger),
`admin_user_id_by_email` / `admin_email_by_user_id` (admin panelinin
`auth.users`'a dokunmadan e-posta çözmesi için; ikisi de önce `is_admin()`
kontrol ediyor).

---

## RLS modeli

Üç kalıp var:

**Kişisel veri — yalnızca sahibi.** `assets`, `downloads`, `generations`,
`generation_images`, `credit_transactions`, `video_jobs`, favori tabloları.
Hepsi `auth.uid() = user_id`. `generation_images` ayrıca `deleted_at IS NULL`
şartı koyuyor, yani yumuşak silinen görseller okunamıyor.

**Katalog — preset herkese açık, kendi kaydın sana.** `models`, `styles`,
`backgrounds`: `owner_id IS NULL OR owner_id = auth.uid() OR is_admin()`.
Yazma `source='user'` şartıyla sınırlı, yani kullanıcı kendi kaydını preset
gibi gösteremiyor.

**Admin — her şey.** `is_admin()` ile `ALL` politikası: `models`, `poses`,
`backgrounds`, `styles`, `style_categories`.

`profiles` yalnızca okunuyor: kendi satırın veya admin isen hepsi. Yazma
politikası bilinçli olarak yok.

---

## Uygulamayla tutmayan üç nokta

### 1 · `backgrounds` üzerinde fazladan bir SELECT politikası var

`backgrounds` diğer katalog tablolarından farklı olarak **iki** SELECT
politikası taşıyor:

```
backgrounds_select_visible   using: owner_id IS NULL OR owner_id = auth.uid() OR is_admin()
backgrounds_select_active    using: is_active
```

PostgreSQL'de aynı komut için birden fazla **permissive** politika `OR` ile
birleşir. `backgrounds.is_active` varsayılanı `true` ve uygulama kullanıcı
arkaplanı kaydederken bu alanı hiç set etmiyor
([ecom-studio](../../app/(app)/ecom-studio/page.tsx) satır ~327) — yani her
kullanıcının kaydettiği arkaplan satırı `is_active = true` doğuyor.

Bu iki politika da permissive ise sonuç şu: **bir kullanıcının kaydettiği
arkaplan, prompt'u dahil, tüm oturum açmış kullanıcılara okunabilir hâle
geliyor.** `models` ve `styles`'da böyle bir politika yok — bu asimetri,
politikanın kullanıcı-arkaplan özelliği eklenmeden önceden kaldığını
düşündürüyor.

Doğrulamak için gereken sorgu aşağıda. Onaylanırsa çözüm basit:
`backgrounds_select_active` politikasını kaldırmak ya da
`is_active AND owner_id IS NULL` hâline getirmek.

### 2 · `models.owner_user_id` ölü kolon

`models` tablosunda hem `owner_id` hem `owner_user_id` var. Yabancı anahtar
`owner_user_id → profiles.id` üzerinde tanımlı, ama RLS politikaları ve
uygulama kodunun tamamı `owner_id` kullanıyor (kodda 39 kullanım, diğerinde
sıfır). `owner_user_id` muhtemelen bir göç artığı.

### 3 · `video_jobs.updated_at` dökümde yok ama koda yazılıyor

[generate-video-status](../functions/generate-video-status/index.ts) iki
yerde `updated_at: new Date().toISOString()` yazıyor. `tablolar.csv`'de
`video_jobs`'ın böyle bir kolonu görünmüyor — ama o CSV 100 satırda kesildiği
ve `video_jobs` en sonda olduğu için büyük ihtimalle sadece dökümden düşmüş.
Aşağıdaki sorgu bunu kesinleştirir.

---

## Edge function'lar ve dokundukları tablolar

Dokuzunun tamamı artık repoda (`supabase/functions/`).

| fonksiyon | okur | yazar | kredi |
|---|---|---|---|
| `generate-ecom` | profiles | generations, generation_images | `deduct_credits` |
| `generate-pose` | profiles | generations, generation_images | `deduct_credits` |
| `generate-ghost` | profiles | generations, generation_images | `deduct_credits` |
| `generate-edit` | profiles | generations, generation_images | `deduct_credits` |
| `generate-style-transfer` | profiles | generations, generation_images | `deduct_credits` |
| `generate-video-submit` | profiles | video_jobs | yalnızca kontrol eder |
| `generate-video-status` | video_jobs | video_jobs, generations | `deduct_credits` (başarıda) |
| `cleanup-expired` | generation_images | generation_images | — |
| `request-access` | — | — (Resend'e e-posta) | — |

Görsel üretenlerin hepsi Gemini'ye, video ikilisi Kling'e gidiyor.
Kredi yalnızca üretim başarılı olduğunda düşülüyor.

---

## Eksikler ve panelden alınması gerekenler

Dört CSV'den ikisi tam 100 satırda kesilmiş — Supabase SQL editörünün satır
limiti. `rls.csv` (34 satır) ve `fonksiyonlar.csv` (8 satır) tam.

Aşağıdaki dört sorgu, sonucu tablo başına tek satıra indirdiği için limite
takılmaz. Panelde çalıştırıp CSV olarak indirmen yeterli.

### A · Kolonlar (tablolar.csv'nin tamamı)

```sql
select table_name,
       string_agg(
         column_name || ' ' || data_type ||
         case when is_nullable = 'NO' then ' NOT NULL' else '' end ||
         coalesce(' default ' || column_default, ''),
         E'\n' order by ordinal_position
       ) as columns
from information_schema.columns
where table_schema = 'public'
group by table_name
order by table_name;
```

### B · Kısıtlar ve yabancı anahtarlar (baglar.csv'nin tamamı)

`styles`, `style_categories` ve `video_jobs` mevcut dökümde hiç yok.

```sql
select c.conrelid::regclass::text as table_name,
       string_agg(c.conname || ' :: ' || pg_get_constraintdef(c.oid), E'\n') as constraints
from pg_constraint c
join pg_namespace n on n.oid = c.connamespace
where n.nspname = 'public'
group by c.conrelid
order by 1;
```

Bu, mevcut dökümde tanımı hiç gelmemiş **69 CHECK kısıtını** da getirir —
`status`, `role`, `tool`, `source` gibi alanların hangi değerleri kabul
ettiğini öğrenmemizin tek yolu bu ve yeni akışlar tasarlarken gerekecek.
Ayrıca `auth.users`'a giden yabancı anahtarları da çözer (mevcut dökümde 8
tanesi boş geldi, çünkü sorgu yalnızca `public` şemasına bakıyordu).

### C · RLS politikalarının permissive/restrictive durumu

Yukarıdaki `backgrounds` sorusunu kesinleştirmek için:

```sql
select tablename, policyname, cmd, permissive, roles
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;
```

### D · Trigger'lar

`handle_new_user` ve `set_updated_at` fonksiyonları var ama hangi tablolara
bağlı oldukları dökümde yok:

```sql
select event_object_table as table_name,
       trigger_name, action_timing, event_manipulation, action_statement
from information_schema.triggers
where trigger_schema = 'public'
order by 1, 2;
```

### Bunlarda olmayan, ileride lazım olacaklar

Aceleye gerek yok, ama tam resim için eninde sonunda gerekecek: indeksler
(`pg_indexes`), Storage bucket'ları ve onların politikaları (`storage.buckets`,
`storage.objects` üzerindeki policy'ler), ve cron ayarları
(`cleanup-expired` fonksiyonunu ne tetikliyor).
