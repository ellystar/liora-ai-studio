# Liora Atelier v2 · Devir notu

5 Kasım 2026 · Melis'ten Elif'e

v2'nin ilk iki aşaması bitti: giriş ve bakiye canlıya bağlı, yeni tablolar canlıda. Canlı müşteri hiçbir değişiklik
görmedi; Aşama 2'den sonra MVP'de 7 başarılı üretim yapıldı (sonuncusu 4 Kasım). **Sıradaki iş Aşama 3 · Üretim.**

Kurallar `CLAUDE.md`'de, ayrıntılı plan `docs/v2/sozlesme.md`'de. Bu not ikisinin arasındaki köprü: bugün ne durumda,
sırada ne var, nasıl yapılır.

## Aşamalar

| Aşama | Durum | Not |
| --- | --- | --- |
| 0 · Hazırlık | Bitti, 27 Ekim | Canlı kontrol edildi, acil açık yok. "Fotoğrafı düzenle" ve indirme düzeltmeleri canlıda. Repo ile canlı fonksiyonlar eşitlendi. Supabase Pro'ya geçildi. `v2` önizlemesi korumalı açılıyor |
| 1 · Okuma | Kısmen | Giriş, bakiye, kredi hareketleri ve çıkış canlıya bağlı. Kast, ortam ve poz katalog bağlantısı **bekletiliyor** (Melis'in 30 Ekim kararı: prototipin görselleri kalır) |
| 2 · Yeni tablolar | Bitti, 30 Ekim | 12 tablo, 15 sütun, 2 kapalı fiyat satırı, 3 hesap RPC'si canlıda. Öncesi/sonrası karşılaştırması temiz. Sonrasında MVP'de 7 başarılı üretim |
| 3 · Üretim | **Sıradaki** | Akışlar gerçek kare üretir, kredi düşer. Ayrıntı aşağıda |
| 4 · Kimlik | Bekliyor | Kayıt, `/start` cevaplarının hesaba taşınması, şifre sıfırlama, e-postalar |
| 5 · Cast Studio, kuyruklar, bildirimler | Bekliyor | Cast Studio, iade incelemesi, bildirimler, admin |
| 6 · Geçiş | Bekliyor | PayTR, yasal sayfalar, mevcut müşterinin hesabı, son test, `v2` → `main` |

## Canlıda bugün (5 Kasım 2026, salt okunur kontrol)

- **GitHub:** `main` = `7badf55`, `v2` = bu notun commit'i. `main` korumasını Elif açtığını bildirdi; ayar doğrulanmadı.
- **Vercel:** `main` canlıya kuruluyor. Önizlemeler korumalı (Standard Protection); Supabase anahtarları Production ve Preview için tanımlı.
- **Supabase:** Pro plan, günlük yedek (sonuncusu 5 Kasım 01:59 UTC). 27 tablo. v2 tablolarında hiç satır yok. Bütün `plans` satırları kapalı. Aşama 3'ün dört veritabanı fonksiyonu (`v2_open_job`, `v2_finish_frame`, `v2_reconcile_frame`, `v2_recover_frames`) 5 Kasım öğleden sonra uygulandı; yalnızca `service_role` çağırabilir, `pg_cron`'da ikinci iş `v2-recover-frames` (her 5 dakikada `v2_recover_frames()`, aynı gün uygulandı).
- **Fiyatlar (`systems`):** `flat_to_form` 1, `ghost_to_campaign` 1, `rebuild_shoot` 2, `many_markets` 1 (kare başına), `product_video` 4 (iş başına). `cast_studio_try` 1 ve `cast_exclusive` 30 kapalı.
- **Edge function'lar:** ecom v49, pose v31, ghost v22, edit v25, video-submit v15, video-status v14, request-access v12, style-transfer v11, cleanup-expired v2. v2'nin ilk iki fonksiyonu: `start-run-v2` v1 ve `run-frame-v2` v1 (5 Kasım, JWT kapalı; bugün onları çağıran ekran yok). 27 Ekim'deki karşılaştırmadan ve PR #4'ten sonra dokuzunun da canlı kodu `main` ile aynı (`generate-ghost`'ta yalnızca dosya sonu boşluğu farkı).
- **Hesaplar:** MVP'de hesaplar Supabase panelinden elle açılıyor; yeni kayıt ve e-posta onayı kapalı, Google kullanılmıyor.

## Repo ve klasörler

- **`v2` dalı arayüzün tek kaynağı.** Melis'in bilgisayarındaki `atelier-proto` prototipi buraya kopyalandı ve artık kullanılmıyor (uzak deposu yok).
- `src/lib/supabase/client.ts`: Supabase istemcisi. Anahtar yoksa arayüz taklit veriyle çalışır (`hasBackend`).
- `src/lib/live.ts`: canlıdan okumalar (hesap, kredi hareketleri).
- `src/lib/store.tsx`: arayüz durumu. `live` alanı canlı oturumu tutar; canlıdayken taklit üretim gerçek bakiyeye dokunmaz.
- `supabase/migrations/`, `supabase/rollback/`, `supabase/tests/v2-migrations/`: Aşama 2'nin dosyaları, geri almaları ve sınavı.
- `supabase/functions/`: MVP'nin canlı fonksiyonları. Değiştirilmez; v2 fonksiyonları `-v2` adıyla yanına eklenir.
- **Dallar:** `c1/style-transfer-cast-swap` asla `main`'e girmez; içindeki `cast_swap` kodu `generate-style-transfer-v2` olarak dağıtılacak. Diğer dallar birleşti.

## Kurulum (Elif'in bilgisayarı)

1. Mevcut `liora-ai-studio` klasöründe: `git fetch origin`. v2'yi ayrı bir klasörde açmak MVP klasörünü bozmaz:
   `git worktree add ../liora-ai-studio-v2 v2`
2. VS Code'da `liora-ai-studio-v2` klasörünü aç. Terminalde: `npm ci`, sonra `npx next typegen`.
3. `.env.local`: MVP klasöründeki `.env.local` dosyasını v2 klasörüne kopyala (iki değişken: Supabase adresi ve anon anahtarı). Git'e girmez.
4. `npm run dev` ile http://localhost:3000. Mockup sekmesinden **sign in** ile kendi hesabınla girersen sol kenarda "Live · …" yazar.
5. Supabase komut aracı: `npx supabase login` (tarayıcıda onay). Sonra ajan salt okunur kontrolleri yapabilir.

## Devirden önce çözülmesi gereken: Vercel erişimi

PR #3'te gördük: Vercel, Elif'in GitHub hesabıyla atılan commit'ler için önizleme kurmadı; şimdiye kadarki bütün canlı
kurulumlar Melis'in birleştirmeleriydi. Vercel projesi Melis'in hesabında (`lioralabs`). Elif'in commit'leri ve
birleştirmeleri büyük olasılıkla kurulmaz; bu, bir `main` düzeltmesinin canlıya çıkmaması demek.

Çözüm Melis'te: Elif'i Vercel ekibine eklemek (planın buna izin vermesi gerekir) ya da projeyi Elif'in Vercel hesabına
taşımak. O zamana kadar Elif yerelde test eder ve canlıya çıkacak birleştirmeleri Melis yapar.

## Sıradaki adım: Aşama 3 · Üretim

**Hedef:** v2'deki akışlar gerçek kare üretir; her kare kendi çağrısında üretilir, kredi yalnızca gelen kare için düşer,
iş İşlerim'de doğru durumda görünür. Ayrıntılı tasarım sözleşmenin "Akış başına üretim sözleşmesi" ve "İş yaşam
döngüsü" bölümlerinde.

**Yapılacaklar (sözleşmeden):**

- `start-run-v2`: işi açar (`jobs`, `job_frames`), kareleri tetikler. `run-frame-v2`: tek kare üretir. Takılan kare yeniden üretilmez, kurtarılır (K16, 5 Kasım 2026; sözleşmede "Takılan kare: kurtarma").
- Akışlar mevcut motorlara gider: Ghost'tan Kampanyaya ve Batch → `generate-ecom`; Look Composer → `generate-ecom` (`rebuild_shoot`); Model Swap → `generate-style-transfer-v2` (`c1` dalındaki kod); Flat'ten Ghost'a → `generate-ghost`; Look Composer'ın ücretsiz ghost adımı → `generate-ghost-v2` (K3); 180° Video → `generate-video-submit` + `generate-video-status-v2` (videonun adresini saklar, çift ücreti önler).
- Taslaklar `setups`'a, İşlerim ve sonuç sayfası `jobs` / `job_frames`'ten okunur. Kareyi düzenle, tekrar dene, yeniden üret, Beğendim.

**Kast ve ortam görselleri:** v2 prototipin görsellerini gösteriyor (Ada, Mateo, Alçı stüdyo…). Canlı fonksiyonlar
manken görselini isteğin içinde dosya olarak alıyor (`body.model`, base64), `modelId` yalnızca kayıt için. Yani test
üretimi için veritabanında katalog satırı gerekmez: kart hangi görseli gösteriyorsa o gönderilir.

Gerçek görseller geldiğinde dikkat: `models` ve `backgrounds` tabloları MVP ile ortak. Sahipsiz yeni bir satır MVP'deki
müşteriye de görünür (Kural 1). v2'ye özel katalog ya geçiş günü eklenir ya da ayrı bir yolla tutulur; bu karar Aşama 3
başında verilmeli.

**Önerilen ilk parça:** tek bir akış, tek kare, uçtan uca. Ghost'tan Kampanyaya en uygunu: MVP'deki kullanımın büyük
kısmı bu motor (`ecom_studio`, son 30 günde en çok kullanılan). Kabul: kare gelir, `jobs.credits_spent` ile
`credit_transactions` birebir tutar, sayfadan çıkıp dönünce iş İşlerim'de doğru durumda.

**Maliyet:** her test üretimi gerçek kredi ve Gemini maliyeti doğurur. Test için hesaba kredi SQL Editor'den yüklenir:

```sql
select public.add_credits(
  (select id from auth.users where email = '<test hesabı>'),
  <adet>,
  'test: <neyi test ettiğin>'
);
```

## Açık işler ve kararlar

| Konu | Durum | Kimde |
| --- | --- | --- |
| Vercel erişimi | Elif'in commit'leri kurulmuyor (yukarıda) | Melis |
| Tasarım revizeleri | Melis sonra verecek; görünüm onaysız değiştirilmez | Melis |
| Gerçek görseller | Kast, ortam, poz, stil görselleri; geldiklerinde aynı kartlara | Melis / Elif |
| v2 katalog kaydı | Gerçek görseller MVP'de görünmeden nasıl tutulacak | Aşama 3 başı |
| PayTR | Hesap onaylı; entegrasyon belgeleri gelince Aşama 1–5 ile paralel başlayabilir. Canlıda test ödemesi yapılmaz | Elif |
| Yasal sayfalar | MVP'deki gizlilik, şartlar, mesafeli satış, iade, fiyatlandırma v2'ye taşınacak; PayTR incelemesi için şart | Aşama 6 |
| Mevcut müşteri | Geçişten önce `accounts` satırı (`trial_granted_at` dolu, deneme kredisi almaz); beta adresinde birlikte deneme | Aşama 6 |
| Kullanıcı dosyaları açık kovada (A4) | 15 manken, 3 arka plan yalnızca tam adresle açılıyor; acil değil, geçişte kapalı kovaya taşınır | Aşama 6 |
| `username_available` | Oturumsuz çağrılabiliyor; istek sınırı gerekiyor | Aşama 4 |
| T5 · ghost kalitesi | Mankenli çekimde `generate-ghost` kalitesi test edilmedi | Aşama 3 |
| T3 · oranlar | 5 oranın Gemini'de çalıştığı ilk test üretiminde doğrulanır | Aşama 3 |
| T8 · test Supabase'i | İsteğe bağlı; Kural 3'ü esnetecek işler için | — |
| `main` koruması | Elif açtığını bildirdi; ayar kontrol edilmedi | Elif |

## Nasıl yapılır

**Canlıyı okumak (salt okunur).** Veritabanı şifresi gerekmez; boş bir geçici klasörden çalıştırılır ki repo
etkilenmesin. Sorgu salt okunur işlem içinde olduğu için yazmaya kalksa veritabanı reddeder:

```bash
W="$(mktemp -d)"; mkdir -p "$W/supabase"
npx supabase db query --linked --project-ref teemolajohctzejbwbrj --workdir "$W" -o json \
  "begin transaction read only; select count(*) from public.jobs; commit;"
```

Müşteri verisi okunmaz; yalnızca sayılar ve yapı.

**Fonksiyonları görmek:** `npx supabase functions list --project-ref teemolajohctzejbwbrj -o json`.
Canlı kodu indirmek (karşılaştırma için, boş bir klasöre):
`npx supabase functions download --project-ref teemolajohctzejbwbrj --workdir "$W" --use-api`.

**Yedek:** `npx supabase backups list --project-ref teemolajohctzejbwbrj -o json`.

**Veritabanı değişikliği:** yeni migration (tarihli ad, `_v2_` içerir) + aynı adla `.down.sql` + sınava kontroller.
Sınav:

```bash
cd supabase/tests/v2-migrations
npm install --no-save @electric-sql/pglite@0.2.17
node sinav.mjs
```

Geçince insan onayıyla canlıya, dosya dosya, ilk hatada durarak uygulanır. Sonra canlı salt okunur sorgularla
karşılaştırılır (yeni nesneler var, eski hiçbir şey değişmemiş, fiyatlar ve satır sayıları aynı).

**Fonksiyon dağıtmak:** yalnızca `-v2` fonksiyonları, adıyla ve `--no-verify-jwt --use-api` ile. Dağıtımdan sonra
`functions list` ile sürüm ve JWT ayarı, `functions download` ile kodun repodakiyle aynı olduğu kontrol edilir.

**Önizleme:** Vercel → Deployments → `v2` satırı. Oturum her dağıtımın kendi adresine bağlı; sabit dal adresi
(`…-git-v2-…`) kullanılırsa her gönderimden sonra yeniden giriş gerekmez.

## Bağlantılar

- Repo: https://github.com/ellystar/liora-ai-studio
- Canlı: https://atelier.lioralabs.io
- Supabase projesi: `teemolajohctzejbwbrj` (eu-central-1), organizasyon Liora Labs, Pro
- Sözleşme: `docs/v2/sozlesme.md`. 30 Ekim'deki claude.ai dokümanının kopyası; bundan sonra güncel olan bu dosya. Asıl doküman Melis'in hesabında, salt başvuru için: https://claude.ai/artifact/2DXFxhkfj446VyRqqBHU9r
