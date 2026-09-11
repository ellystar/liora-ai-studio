# Veritabanı şeması — okunabilir özet

Kaynak: Supabase panelinden alınan döküm, 11 Eylül 2026.
Proje referansı `teemolajohctzejbwbrj`.

| dosya | içerik |
|---|---|
| `kolonlar.csv` | 14 tablo, tüm kolonlar, tipler, varsayılanlar |
| `kisitlar.csv` | PK / FK / CHECK tanımları |
| `rls-politikalari.csv` | 34 politikanın `using` ve `with check` ifadeleri |
| `rls-roller.csv` | aynı politikaların permissive/restrictive durumu ve rolleri |
| `fonksiyonlar.csv` | 8 fonksiyonun tam tanımı |
| `triggerlar.csv` | `public` şemasındaki trigger'lar |

Bu bir **anlık görüntüdür, migration değildir.** Şema hâlâ yalnızca uzak
Supabase projesinde yaşıyor; buradaki dosyalar onu okumak için var, ondan
üretmek için değil.

> 🔴 **Açık bir gizlilik sorunu var.** Aşağıda [Bulgu 1](#bulgu-1--kullanıcıların-kaydettiği-arkaplanlar-herkese-açık-🔴).

---

## Tablolar — 14 tane, dört öbek

### 1 · Kimlik ve kredi

**`profiles`** — `auth.users` ile bire bir. Kullanıcı kaydolunca
`handle_new_user` trigger'ı otomatik oluşturuyor.

| kolon | tip | izin verilen değerler |
|---|---|---|
| `id` | uuid | PK → `auth.users.id` |
| `email`, `full_name` | text | |
| `credits` | integer | **`>= 0` (CHECK)** |
| `role` | text | `user` \| `admin` |
| `preferred_language` | text | `tr` \| `en` |
| `created_at`, `updated_at` | timestamptz | `updated_at` trigger'la bakılıyor |

**`credit_transactions`** — kredi defteri. `amount` pozitif (yükleme/iade)
veya negatif (kullanım). `type`: `topup` \| `usage` \| `refund`.
`tool` hangi stüdyo olduğunu tutuyor ve **kısıtsız** — yani yeni bir araç
eklenince defter tarafı sorun çıkarmıyor.

### 2 · Üretim kaydı

**`generations`** — her üretim çalışması bir satır.

| kolon | izin verilen değerler |
|---|---|
| `status` | `pending` \| `success` \| `failed` |
| `tool` | `ecom_studio` \| `pose_generator` \| `flat_to_ghost` \| `edit_photo` \| `style_transfer` |
| `credits_charged`, `image_count` | integer |
| `params` | jsonb |

**`generation_images`** — üretilen görseller. `storage_path`,
`expires_at` (**varsayılan `now() + 7 gün`**), `deleted_at` (yumuşak silme).
Yedi günlük saklama gizlilik politikasında da yazıyor; `cleanup-expired`
edge function'ı uyguluyor.

**`downloads`** — indirme izi. **`video_jobs`** — Kling video üretimi
asenkron olduğu için ayrı kuyruk: `provider_task_id`, `status`,
`credits_cost`, `credits_charged` (boolean, çift ücretlendirmeyi engelliyor),
`error_code`, `created_at`, `updated_at`.

### 3 · Katalog

| tablo | ne | kullanıcı ekleyebilir mi | değer kısıtları |
|---|---|---|---|
| `models` | manken görselleri | evet (`source='user'`) | `scope`: general\|own · `source`: admin\|user · `gender`: female\|male\|null |
| `poses` | poz presetleri | hayır | `shot_type`: full_body\|medium_shot\|close_up\|null · `direction`: front\|back\|null · `category`: general\|shoe |
| `backgrounds` | arkaplan + prompt | evet (`source='user'`) | `source` kısıtsız |
| `styles` | stil referansları | evet (`source='user'`) | — |
| `style_categories` | stil grupları | hayır | — |

`models`, `backgrounds` ve `styles` aynı kalıbı paylaşıyor: `owner_id` null
ise preset, dolu ise o kullanıcının kendi kaydı.

### 4 · Tercihler

`model_favorites`, `pose_favorites` — `(user_id, hedef_id)` çiftleri.

---

## Yabancı anahtar haritası

Kullanıcıya bağlanan her şey doğrudan `auth.users(id)`'ye gidiyor —
**`profiles`'a değil**. İki istisna var ve ikisi de `profiles(id)`
kullanıyor: `credit_transactions.user_id` ve `generations.user_id`.
Bu tutarsızlık zararsız (ikisi de aynı uuid) ama şemayı okurken şaşırtıyor.

```
auth.users(id)
  ├── profiles.id
  ├── assets.user_id          ├── backgrounds.owner_id
  ├── downloads.user_id       ├── generation_images.user_id
  ├── model_favorites.user_id ├── models.owner_id
  ├── pose_favorites.user_id  ├── styles.owner_id
  └── video_jobs.user_id

profiles(id)
  ├── credit_transactions.user_id
  ├── generations.user_id
  └── models.owner_user_id        ← ölü kolon, Bulgu 2

generations.id       ← generation_images.generation_id
generation_images.id ← downloads.generation_image_id
models.id            ← model_favorites.model_id
poses.id             ← pose_favorites.pose_id
style_categories.id  ← styles.category_id
```

---

## Kredi mantığı — üç fonksiyon, hepsi `SECURITY DEFINER`

Kredi bakiyesini **hiçbir istemci doğrudan değiştiremiyor**: `profiles`
üzerinde UPDATE politikası yok ve uygulama kodu da bu tabloya hiç yazmıyor.
Bakiye yalnızca şu üçüyle değişiyor, üçü de aynı işlemde deftere kayıt
düşüyor:

| fonksiyon | ne yapar |
|---|---|
| `deduct_credits(user, amount, tool)` | Bakiyeyi `for update` ile kilitler, yetersizse `insufficient_credits` fırlatır, düşer, `usage` kaydı atar. |
| `add_credits(user, amount, description)` | Yükleme, `topup` kaydı. |
| `refund_credits(user, amount, tool)` | Başarısız üretim iadesi, `refund` kaydı. |

İyi kurulmuş: yarış koşulu `for update` ile kapatılmış, bakiye ile defter
aynı işlemde güncelleniyor, `credits >= 0` CHECK'i de ikinci bir emniyet.

Diğerleri: `is_admin()` (RLS'in tamamı buna dayanıyor), `handle_new_user()`
(kayıt trigger'ı), `set_updated_at()`, `admin_user_id_by_email` /
`admin_email_by_user_id` (admin panelinin `auth.users`'a dokunmadan e-posta
çözmesi için; ikisi de önce `is_admin()` kontrol ediyor).

### Trigger'lar

`public` şemasında tek trigger var: `profiles_set_updated_at`
(BEFORE UPDATE → `set_updated_at()`).

`handle_new_user` dökümde görünmüyor çünkü `auth.users` üzerinde tanımlı ve
sorgu `public` şemasına bakıyordu. `video_jobs.updated_at` için trigger yok —
edge function'lar elle set ediyor.

---

## RLS modeli

34 politika, hepsi PERMISSIVE. Üç kalıp:

**Kişisel veri — yalnızca sahibi.** `assets`, `downloads`, `generations`,
`generation_images`, `credit_transactions`, `video_jobs`, favoriler.
Hepsi `auth.uid() = user_id`. `generation_images` ayrıca `deleted_at IS NULL`
şartı koyuyor.

**Katalog — preset herkese, kendi kaydın sana.**
`owner_id IS NULL OR owner_id = auth.uid() OR is_admin()`. Yazma `source='user'`
şartıyla sınırlı, yani kullanıcı kendi kaydını preset gibi gösteremiyor.

**Admin — her şey.** `is_admin()` ile `ALL`.

Politikaların bir kısmı `TO public` (yani `anon` dahil) tanımlı ama bu tek
başına sorun değil: `auth.uid() = user_id` gibi ifadeler oturumsuz istekte
`NULL` döndüğü için satır eşleşmiyor. Tek istisna aşağıda.

---

## Bulgular

### Bulgu 1 — Kullanıcıların kaydettiği arkaplanlar herkese açık 🔴

**Doğrulandı.** `backgrounds` diğer katalog tablolarından farklı olarak
**iki** SELECT politikası taşıyor ve ikisi de PERMISSIVE:

| politika | rol | ifade |
|---|---|---|
| `backgrounds_select_visible` | `authenticated` | `owner_id IS NULL OR owner_id = auth.uid() OR is_admin()` |
| `backgrounds_select_active` | **`public`** | `is_active` |

PostgreSQL aynı komut için birden çok permissive politikayı `OR` ile
birleştirir. Etkin kural şu hâle geliyor:

```
is_active  OR  (owner_id IS NULL OR owner_id = auth.uid() OR is_admin())
```

Soldaki taraf tek başına yeterli, `TO public` olduğu için **`anon` rolünü de
kapsıyor** ve `backgrounds.is_active` varsayılanı `true`. Uygulama kullanıcı
arkaplanı kaydederken bu alanı hiç set etmiyor
([ecom-studio](../../app/(app)/ecom-studio/page.tsx) satır ~327), yani her
kayıt `is_active = true` doğuyor.

**Sonuç:** anon anahtarı olan herkes — ki o anahtar tarayıcı paketinde
gönderiliyor, yani herkes — `backgrounds` tablosunun tamamını okuyabiliyor:
başka kullanıcıların **prompt metinleri**, arkaplan adları, `owner_id`
değerleri ve `image_path`'leri. Oturum açmaya bile gerek yok.

Sızmayanlar: görsellerin kendisi (Storage'ın ayrı politikaları var,
`image_path`'i bilmek tek başına dosyayı vermiyor), e-postalar, krediler.

Bunun `backgrounds`'a özgü olduğunu da doğruladım. `models_select_visible`
de `TO public` ama ifadesi oturumsuz istekte yalnızca preset'leri
eşleştiriyor (`auth.uid()` null olunca `owner_id = auth.uid()` NULL döner).
`poses_select_active` de `TO public` + `is_active` ama `poses` tablosunda
`owner_id` yok, hepsi preset. Yani kusur tek bir politikada: kullanıcı
arkaplanı özelliği sonradan eklenmiş ve bu eski politika güncellenmemiş.

**Teyit için tek sorgu** (anon rolünün masa üzerinde SELECT yetkisi
olduğunu varsaydım; Supabase varsayılanı bu yönde ama CSV'lerden
göremiyorum):

```sql
begin;
set local role anon;
select count(*) as anonun_gorebildigi_kullanici_arkaplani
from public.backgrounds
where owner_id is not null;
rollback;
```

Sonuç 0'dan büyükse sızıntı canlıda aktif.

**Önerilen düzeltme — uygulanmadı, karar sizin.**

En küçük müdahale, hatalı politikayı preset'lerle sınırlamak:

```sql
drop policy backgrounds_select_active on public.backgrounds;

create policy backgrounds_select_active on public.backgrounds
  for select to authenticated
  using (is_active and owner_id is null);
```

Neden bu biçim:

- `owner_id is null` koşulu politikayı yalnızca preset'lere bağlıyor,
  kullanıcı kayıtları `backgrounds_select_visible`'ın kapsamında kalıyor.
- `to authenticated`, anon erişimini tamamen kesiyor. Uygulamada arkaplan
  yalnızca oturum arkasındaki stüdyo sayfalarında okunuyor, yani anon
  erişimine ihtiyaç yok.
- `is_active` korunuyor; politikayı tamamen silmek, admin'in pasife aldığı
  preset'lerin yeniden görünmesine yol açardı.

Uygulama tarafında değişiklik gerekmiyor. Geriye dönük bir temizlik
gerekip gerekmediği ayrı bir soru: bugüne kadar kaç arkaplanın okunduğunu
bilmiyoruz, loglara bakmak gerekir.

### Bulgu 2 — `models.owner_user_id` ölü kolon

`models`'ta hem `owner_id` (→ `auth.users`) hem `owner_user_id`
(→ `profiles`) var. RLS politikaları ve uygulama kodunun tamamı `owner_id`
kullanıyor; `owner_user_id` kodda hiç geçmiyor. Göç artığı.
**Şimdilik dokunulmuyor, not olarak duruyor.**

### Bulgu 3 — çözüldü

`video_jobs.updated_at` şemada var (`timestamptz NOT NULL default now()`),
`created_at` da öyle. İlk dökümde görünmemelerinin sebebi CSV'nin 100
satırda kesilmesiydi. Kodla şema tutarlı.

### Bulgu 4 — video üretimleri `generations` tablosuna hiç yazılamıyor 🟠

`generations.tool` üzerindeki CHECK yalnızca şunlara izin veriyor:

```
ecom_studio · pose_generator · flat_to_ghost · edit_photo · style_transfer
```

Ama [generate-video-status](../functions/generate-video-status/index.ts)
hem başarı hem hata yolunda `tool: 'ai_video'` ile insert yapıyor. `ai_video`
listede yok, dolayısıyla insert CHECK'e takılıyor. Kod dönen hatayı
kontrol etmediği için sessizce düşüyor: kredi düşüyor, `video_jobs`
`succeeded` oluyor, video çalışıyor — ama **üretim kaydı hiç oluşmuyor**.

Görünen etkisi: video üretimleri Çekimlerim'de ve üretim geçmişinde yok.
Kredi defteri (`credit_transactions`) etkilenmiyor, çünkü orada `tool`
alanının kısıtı yok — yani harcama görünüyor, karşılığındaki üretim
görünmüyor.

Düzeltme iki şekilde olabilir: CHECK'e `ai_video` eklemek, ya da kısıtı
tamamen kaldırıp araç adlarını uygulama tarafında tutmak. İkincisi yeni
stüdyolar eklendikçe her seferinde migration gerektirmemesi açısından daha
rahat. **Bu da uygulanmadı.**

---

## Edge function'lar ve dokundukları tablolar

Dokuzunun tamamı repoda (`supabase/functions/`).

| fonksiyon | okur | yazar | kredi |
|---|---|---|---|
| `generate-ecom` | profiles | generations, generation_images | `deduct_credits` |
| `generate-pose` | profiles | generations, generation_images | `deduct_credits` |
| `generate-ghost` | profiles | generations, generation_images | `deduct_credits` |
| `generate-edit` | profiles | generations, generation_images | `deduct_credits` |
| `generate-style-transfer` | profiles | generations, generation_images | `deduct_credits` |
| `generate-video-submit` | profiles | video_jobs | yalnızca kontrol |
| `generate-video-status` | video_jobs | video_jobs, generations ⚠️ | `deduct_credits` |
| `cleanup-expired` | generation_images | generation_images | — |
| `request-access` | — | — (Resend'e e-posta) | — |

Görsel üretenler Gemini'ye, video ikilisi Kling'e gidiyor. Kredi yalnızca
üretim başarılı olduğunda düşülüyor.

---

## Hâlâ dökümü alınmamış olanlar

Acil değil, ama tam resim için eninde sonunda gerekecek:

- **Storage bucket'ları ve politikaları** — `storage.buckets` ve
  `storage.objects` üzerindeki policy'ler. Bulgu 1'in görselleri kapsayıp
  kapsamadığı da buna bağlı.
- **İndeksler** — `pg_indexes`. Çekimlerim sayfası büyüdükçe önem kazanacak.
- **Cron ayarı** — `cleanup-expired`'ı ne tetikliyor.
- **`auth` şemasındaki trigger'lar** — `handle_new_user`'ın bağlı olduğu yer.
