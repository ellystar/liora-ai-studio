# Liora Atelier v2 — Backend Eşleme Sözleşmesi

> **Kopya notu.** Bu dosya, claude.ai'deki sözleşme dokümanının 30 Ekim 2026 tarihli kopyasıdır (rev 118). 5 Kasım 2026'daki devirden sonra güncel olan bu dosyadır; değişiklikler burada, git ile yapılır. Özet ve bugünkü durum için `docs/v2/DEVIR.md`. Dokümandaki durum seçimleri (Açık / Karar verildi / Doğrulandı) ve diyagramlar düz metne dönüştü.

Oct 27, 2026 · @Liora Labs

## Amaç ve kapsam

Bu sözleşme, yeni arayüzün (v2) canlı müşteriyi hiç etkilemeden mevcut Supabase backend'ine nasıl bağlanacağını tanımlar. Backend ajanı bunu uygulama talimatı, Elif ürün onayı, Melis takip listesi olarak kullanır.

|  | Canlı MVP | v2 arayüz |
| --- | --- | --- |
| Kod | `liora-ai-studio` (GitHub: ellystar/liora-ai-studio) | `atelier-proto` (yerel, etiket: `prototype-v0`) |
| Teknoloji | Next.js 16.2 + Supabase | Next.js 16.3, veri tarayıcıda (sahte depo) |
| Yayın | Vercel, `main` dalı → atelier.lioralabs.io | Henüz yayında değil |
| Kullanıcı | Aktif müşteri | Yalnızca ekip |

Hedef düzen: v2, `liora-ai-studio` deposunda `v2` adlı bir dal olur ve Vercel önizleme adresinde çalışır. Canlı site yalnızca `main` dalından yayınlanmaya devam eder. İki sürüm aynı Supabase projesini "Altın kurallar" bölümündeki sınırlarla paylaşır; ayrı bir test Supabase'i paralelde hazırlanır.

Kapsam dışı: ödeme sağlayıcısının seçimi ve kurulumu, canlı müşterinin v2'ye taşınma tarihi. Bunlar "Açık sorular" bölümünde karar bekliyor.

Dil: ekran ve akış adları arayüzde göründüğü gibi yazılır (ör. Ghost'tan Kampanyaya, Model Swap). Kod, tablo ve fonksiyon adları `kod biçiminde` verilir.

## Altın kurallar

Canlı site ile v2 aynı veritabanını, aynı fonksiyonları ve aynı depolamayı paylaşır; Vercel önizlemesi yalnızca arayüzü ayırır. Bu yüzden aşağıdaki kuralların hiçbiri esnetilmez. Bir kuralı çiğnemeden yapılamayan iş, test Supabase'i hazır olana kadar bekler.

| # | Kural | Neden | Nasıl kontrol edilir |
| --- | --- | --- | --- |
| 1 | `main` dalına doğrudan commit yok. Bütün v2 işi `v2` dalında ya da ondan açılan dallarda. `main`'e birleştirme yalnızca geçiş günü, Melis ve Elif onayıyla. | Vercel `main`'i anında canlıya çıkarır. | GitHub'da `main` için branch protection: PR ve onay zorunlu. |
| 2 | Veritabanında yalnızca ekleme. Mevcut tablo ya da sütun yeniden adlandırılmaz, silinmez, türü değiştirilmez, sonradan NOT NULL yapılmaz. Yeni sütun ya boş bırakılabilir ya da varsayılan değerlidir. | Canlı arayüz ve fonksiyonlar mevcut şemayı bekliyor. | Her migration dosyası yalnızca `create` ve `add column` içerir; incelemede `drop`, `rename`, `alter type` aranır. |
| 3 | Her veritabanı değişikliği `supabase/migrations/` altında bir dosyadır, geri alma betiğiyle birlikte. Supabase panelindeki SQL editöründen elle değişiklik yapılmaz. | Değişiklik izlenebilir ve geri alınabilir kalır. | Dalın migration listesi bu dokümanın "Yeni veri modeli" bölümüyle birebir eşleşir. |
| 4 | Her migration'dan önce yedek alınır (şema ve veri). | Hatalı bir değişiklik müşteri verisini etkileyebilir. | Yedek dosyasının adı ve saati migration notuna yazılır. |
| 5 | Canlıdaki edge function'lara dokunulmaz. v2'nin ihtiyacı olan davranış yeni bir fonksiyondur, adı `-v2` ile biter (ör. `generate-ghost-v2`). Paylaşılan yardımcı kod kopyalanır, düzenlenmez. | Fonksiyonlar dala bağlı değil; dağıtıldığı an müşteri de yeni halini kullanır. | Dağıtım her zaman ad vererek yapılır: `supabase functions deploy generate-ghost-v2`. Adsız `supabase functions deploy` tüm fonksiyonları dağıtır ve yasaktır. |
| 6 | Kredi bakiyesi, fiyatlar, paketler ve ödeme mantığı geçiş gününe kadar dondurulur. Elif'in yeni fiyatları (Basic 30 kredi / $30, Pro 100 / $100) hazırlanır ama etkinleştirilmez. | Erken değişiklik canlı müşterinin faturasını ve bakiyesini değiştirir. | v2 kredi düşüşü mevcut sunucu yolunu kullanır; yeni fiyatlar `plans` tablosunda `active = false` durur. |
| 7 | Mevcut tabloların RLS kurallarına dokunulmaz. Yeni her tabloda RLS ilk günden açıktır; kullanıcı yalnızca kendi satırlarını görür. Service role anahtarı yalnızca edge function'larda kullanılır. | Erişim hatası müşteri verisini açığa çıkarabilir. | Yeni tablo için RLS politikası aynı migration dosyasındadır. |
| 8 | Mevcut fonksiyonların çıktıları kendi yollarına (`outputs/<kullanıcı>/...`) yazılmaya devam eder. v2'nin kendi yüklediği dosyalar (ürün görselleri, Cast Studio, kaydedilen temalar, kurtarılan kareler) `v2/` önekine gider. Mevcut dosyalar taşınmaz, silinmez. | Temizlik ve geri alma kolay kalır. | `cleanup-expired`'ın `v2/` dosyalarına dokunmadığı (yalnızca `generation_images` satırlarını sildiği) doğrulanır; `v2/` için ayrı saklama süresi kuralı yazılır. |
| 9 | v2 yalnızca işaretli test hesaplarıyla denenir. Test hesapları admin istatistiklerinden ayrılır. Her test üretimi gerçek yapay zekâ maliyeti doğurur. | Müşteri verisi ve raporlar temiz kalır; maliyet kontrol altında olur. | Test hesapları listesi ve haftalık üretim sayısı bu dokümana işlenir. |
| 10 | Vercel'de önizleme ortamı değişkenleri ayrı tanımlanır; Production değişkenlerine dokunulmaz. Önizleme adresleri Vercel kimlik koruması arkasındadır. | v2 herkese açık bir adreste çalışmamalı. | Önizleme adresi giriş yapılmadan açılmamalı. |
| 11 | Supabase Auth'un izinli yönlendirme listesine önizleme alan adı eklenir. Mevcut adresler silinmez. | Önizlemede giriş ve Google ile giriş çalışsın. | Ekleme sonrası canlı sitede giriş yeniden denenir. |
| 12 | Her dağıtımdan sonra canlı sitede kısa kontrol yapılır: giriş, çekimler listesi, bakiye. Fark görülürse son değişiklik hemen geri alınır. | Sorun müşteriden önce fark edilsin. | Kontrol sonucu dağıtım notuna yazılır. |
| 13 | Proje geneli Supabase ayarlarına (Auth: kayıt izni, giriş sağlayıcıları, e-posta onayı, SMTP, şablonlar; depolama kova ayarları) Melis ve Elif onayı olmadan dokunulmaz. | Bu ayarlar dala bağlı değil; canlı siteyi anında etkiler. | Her değişiklik "Kimlik ve onboarding" bölümündeki tabloya tarih ve onaylayanla işlenir. |

## Mevcut sistem envanteri

Canlı backend tek bir Supabase projesidir (ref `teemolajohctzejbwbrj`): 14 tablo, 8 veritabanı fonksiyonu, 9 edge function, 7 depolama kovası. Şemanın neredeyse tamamı yalnızca canlı projede duruyor; depoda 2 küçük migration ve 11 Eylül 2026 tarihli bir panel dökümü var. Bu bölüm o dökümden ve koddan derlendi; canlıyla farkı en sondaki kontrollerle doğrulanmalı.

### Tablolar

| Tablo | Ne tutar | v2 için anlamı |
| --- | --- | --- |
| `profiles` | Kullanıcı başına tek satır: e-posta, ad, **bakiye** (`credits`, ≥ 0), rol (`user` / `admin`), dil | Kullanıcı adı, marka, paket yok. Kullanıcının kendi satırını güncelleme izni yok. |
| `credit_transactions` | Kredi defteri: tutar (±), tür (`topup` / `usage` / `refund`), araç | v2'nin harcama geçmişi buradan okunur. |
| `generations` | Üretim başına kayıt: araç, durum (`success` / `failed`), düşülen kredi, görsel sayısı, parametreler | Araç listesi kısıtlı (CHECK); `ai_video` canlıda eklenmiş (Betik 1, 27 Ekim 2026). |
| `generation_images` | Üretilen her görsel: dosya yolu, 7 günlük son kullanma, silinme zamanı | v2'nin kareleri bunlara bağlanır. |
| `downloads` | İndirme kayıtları | v2 indirmeleri de buraya yazar. |
| `video_jobs` | Video işleri: durum, sağlayıcı iş kimliği, fiyat, "ücret alındı" bayrağı | Video adresi sütunu yok. |
| `assets` | Kullanıcının kaydettiği görseller (`user-assets` kovası) | v2'deki "Assetlerden seç" buna denk. |
| `models` | Manken kataloğu: genel (`scope: general`) ve markaya özel (`scope: own`); cinsiyet yalnızca `female` / `male` | v2 kast kataloğu ve "Kendi kadrom" buna denk. |
| `poses` | Poz kataloğu: istem metni, kadraj (`full_body` / `medium_shot` / `close_up`), yön (`front` / `back`), kategori (`general` / `shoe`) | Kullanıcıya ait poz kavramı yok; "Pozlarım" için ek gerekir. |
| `backgrounds` | Arka plan kataloğu: istem metni, küçük görsel; kullanıcı kaydı `source: user` | v2'deki "Arkaplanı kaydet" ve "Kendi temalarım" buna denk. |
| `styles`, `style_categories` | Model Swap'ın referans görsel galerisi | v2'de karşılığı yok; MVP için kalır. |
| `model_favorites`, `pose_favorites` | Favori manken ve pozlar | v2'deki favori yıldızı buna denk. |
| `systems` | Akış başına fiyat | **Canlıda var** (Betik 1, 27 Ekim 2026). Dökümde yoktu; `c1-sistemler.sql` sonradan çalıştırılmış, `generations.system` sütunu da eklenmiş. Fiyatlar Betik 2 ile okunur. |

Abonelik, paket, sipariş, ödeme, kullanıcı adı, marka profili, ürün, kurulum taslağı ya da bildirim tablosu yok.

### Veritabanı fonksiyonları

| Fonksiyon | Ne yapar | Kim çağırır |
| --- | --- | --- |
| `deduct_credits(kullanıcı, tutar, araç)` | Satırı kilitler, bakiye yetmezse hata verir, düşer, deftere `usage` yazar | Edge function'lar (service role) |
| `add_credits(kullanıcı, tutar, açıklama)` | Bakiyeye ekler, deftere `topup` yazar; tutarın işaretini kontrol etmez | Kodda hiçbir yer; kredi yüklemesi elle yapılıyor |
| `refund_credits(kullanıcı, tutar, araç)` | Bakiyeye ekler, deftere `refund` yazar | Kodda hiçbir yer |
| `is_admin()` | Çağıran admin mi | RLS kuralları |
| `handle_new_user()` | Yeni kullanıcıya `profiles` satırı açar (bakiye 0) | `auth.users` tetikleyicisi |
| `admin_user_id_by_email`, `admin_email_by_user_id` | Admin için e-posta ↔ kullanıcı eşlemesi | Admin manken ekranı |

### Edge function'lar

Ayrıntılı sözleşmeleri "Akış başına üretim sözleşmesi" bölümünde. Ortak özellikler:

- Hepsi senkron çalışır; video hariç sonuç aynı yanıtta döner (görsel `data:` adresi olarak).
- Görsel üretimi Google Gemini (`gemini-3-pro-image`, yedek `gemini-3.1-flash-image`), video Kling (`kling-v2-5-turbo`).
- Kimlik: kullanıcının oturumu doğrulanır, sonra tüm veritabanı işleri service role ile yapılır (RLS devre dışı). Rol kontrolü yok.
- Ortak kod klasörü (`_shared`) yok; her fonksiyon kendi kopyasını taşır. Bu, Kural 5'i kolaylaştırır: `-v2` kopyaları diğerlerini etkilemez.
- Başarısız üretimde kredi düşmez; iade yolu bu yüzden hiç kullanılmamış.
- `cleanup-expired`: süresi dolan görselleri her çağrıda en fazla 200 adet siler. Kimin, ne sıklıkla tetiklediği depoda yok.
- `request-access`: giriş sayfasındaki davet talebini e-postayla iletir (Resend).

### Depolama

| Kova | İçerik | Yol | Erişim |
| --- | --- | --- | --- |
| `outputs` | Üretilen görseller | `<kullanıcı>/<generation>/<n>.<uzantı>` | İmzalı adres (1 saat) |
| `models` | Genel ve kullanıcının yüklediği mankenler | `<uuid>` ya da `user/<kullanıcı>/<uuid>` | Herkese açık (Betik 1). Kullanıcının yüklediği mankenler de burada (A4) |
| `user-models` | Admin'in markaya atadığı özel mankenler | `<sahip>/<uuid>` | İmzalı adres |
| `poses`, `backgrounds` | Katalog görselleri; kullanıcının kaydettiği arka planlar | `<uuid>`, `user/<kullanıcı>/<uuid>` | Herkese açık (Betik 1). Kullanıcının kaydettiği arka planlar da burada (A4) |
| `styles` | Model Swap referansları | `admin/<uuid>`, `user/<kullanıcı>/<uuid>` | İmzalı adres |
| `user-assets` | Kullanıcı assetleri | `<kullanıcı>/<uuid>` | İmzalı adres |

Kovaların açık/kapalı ayarı Betik 1 ile canlıdan okundu (27 Ekim 2026). Depolama kuralları da Betik 4 ile okundu: başkasının dosyasını listelemeye izin veren kural yok.

### Kimlik

- Yalnızca e-posta ve şifreyle giriş; ürün davetle çalışıyor.
- Kayıt, şifre sıfırlama, Google ile giriş ve bunların dönüş adresi (`/auth/callback`) yok. Giriş sayfasındaki "Şifremi unuttum" boş bir bağlantı.
- Korunan sayfalar Next.js `proxy.ts` ile oturumu olmayanı `/login`'e yönlendirir. Admin sayfaları `profiles.role = 'admin'` ister.

### Kredi, fiyat ve ödeme

- Tek bakiye: `profiles.credits`. Yeni hesap 0 krediyle açılıyor; fiyat sayfası "3 deneme kredisi" diyor.
- Fiyatlar üç yerde: `systems` tablosu (4 fonksiyon okuyor), fonksiyonlara sabit yazılmış değerler (poz ve düzenleme 1 kredi), arayüzdeki onay pencereleri.
- Paketler `lib/pricing.ts`'de: Başlangıç 20 kredi ($24 / ₺1120), Studio 100 kredi ($120 / ₺5550), Business teklifle.
- **Ödeme altyapısı yok.** "Paketi al" butonu var olmayan `/odeme` sayfasına gidiyor; krediler elle yükleniyor.

### Canlıda doğrulanması gerekenler

Bu kontroller yalnızca okuma yapar, canlıyı etkilemez. Sonuçlar bu bölüme işlenir.

1. **Acil, v2'den bağımsız:** `add_credits`, `refund_credits` ve `deduct_credits` kimlik kontrolü yapmıyor ve her kullanıcı kimliğini kabul ediyor. Postgres varsayılan olarak herkese çalıştırma izni verir. İzin kaldırılmadıysa giriş yapmış herhangi biri kendine kredi yükleyebilir ya da başkasının kredisini düşebilir. Kontrol: `select has_function_privilege('authenticated', 'public.add_credits(uuid,integer,text)', 'execute');` (aynısı `anon` ve diğer iki fonksiyon için).
2. `systems` tablosu var mı: `select to_regclass('public.systems');` Yoksa ve canlıdaki fonksiyonlar güncel koddaysa, üretimler fiyat okuyamayıp hata veriyor olmalı.
3. Hangi fonksiyon sürümlerinin dağıtıldığı (Supabase panelindeki dağıtım tarihleri ile commit tarihleri karşılaştırılır).
4. `generations.tool` kısıtı `ai_video` içeriyor mu: `select pg_get_constraintdef(oid) from pg_constraint where conname = 'generations_tool_check';`
5. `backgrounds` tablosundaki herkese açık okuma kuralı duruyor mu (bekleyen düzeltme 1).
6. Her tabloda RLS açık mı; depolama kovalarının açık/kapalı ayarı.
7. `cleanup-expired`'ı neyin tetiklediği (cron).
8. Supabase Auth ayarları: kayıt açık mı, hangi yönlendirme adresleri izinli.

**Betik 1 sonucu · 27 Ekim 2026**

- **1 · Kredi izinleri kapalı.** `add_credits`, `refund_credits` ve `deduct_credits` `anon` ve `authenticated` için çalıştırılamıyor; A1 kapandı. İki admin fonksiyonu (`admin_user_id_by_email`, `admin_email_by_user_id`) ikisine de açık, ama içerideki `is_admin()` oturumsuz ve admin olmayan çağrıyı reddediyor. `anon` izni yine de kaldırılabilir; acil değil.
- **2 · `systems` tablosu var**, `generations.system` sütunu da. Fiyatlar Betik 2 ile okunacak.
- **3 · Fonksiyon sürümleri** panelden okunacak (T1).
- **4 · `ai_video` kısıtta var.** Bekleyen düzeltme 2a uygulanmış. Eski video işlerinin kayıtlarının geri doldurulması (2b) ayrıca bakılabilir.
- **5 · `backgrounds` tablosundaki herkese açık okuma kuralı kaldırılmış.** Kalan dört kuralın hepsi yalnızca oturum açmış kullanıcıya; bekleyen düzeltme 1 uygulanmış.
- **6 · RLS her tabloda açık.** Kovalardan `models`, `poses` ve `backgrounds` herkese açık; `outputs`, `user-models`, `user-assets` ve `styles` kapalı. Kullanıcının yüklediği mankenler (`models` kovasında `user/…`) ve kaydettiği arka planlar (`backgrounds` kovasında `user/…`) açık kovalarda duruyor: adresi bilen herkes açabilir. Ayrıntı A4'te.
- **7 · `pg_cron` kurulu.** Temizlik işinin tanımlı olup olmadığı Betik 3 ile okunacak (T6).
- **8 · Auth ayarları** panelden okunacak.

**Betik 2–4 sonucu · 27 Ekim 2026**

- **Fiyatlar (Betik 2).** Beş sistemin beşi de etkin ve fiyatlar sözleşmedeki tohum değerleriyle aynı: `flat_to_form` 1, `ghost_to_campaign` 1, `rebuild_shoot` 2, `many_markets` 1 (kare başına), `product_video` 4 (iş başına). `name` sütunu eski adları taşıyor ("One Product, Many Markets", "Rebuild the Shoot"). MVP'yi değiştirmemek için v2 ekran adlarını kendi metninden alır, bu sütuna dokunmaz. `cast_studio_try` ve `cast_exclusive` satırları henüz yok; beklendiği gibi, Aşama 2'de eklenir.
- **Temizlik (Betik 3).** `cleanup-expired-outputs` işi her gün 03:00'te çalışıyor (Supabase saati UTC; Türkiye'de 06:00). T6 kapandı.
- **Depolama kuralları (Betik 4).** `models` ve `poses` kovalarında okuma kuralı hiç yok. `backgrounds` kovasında kullanıcı yalnızca kendi klasörünü, admin hepsini okuyabiliyor. Yani ne oturumsuz biri ne başka bir kullanıcı başkasının dosyalarını listeleyebiliyor. Açık kovalarda 15 kullanıcı mankeni (`models`) ve 3 kullanıcı arka planı (`backgrounds`) var. Bunlara yalnızca tam adresle ulaşılıyor; adresler tablo kayıtlarında duruyor ve o kayıtları yalnızca sahibi ile admin görüyor. A4 acil değil.

**Panel ve CLI sonucu · 27 Ekim 2026**

- **Fonksiyon sürümleri (T1).** Dokuz fonksiyonun canlı kodu indirilip `main` ile karşılaştırıldı. Sekizi `main` ile aynı (`generate-ghost`'ta yalnızca dosya sonu boşluğu farkı var). **`generate-ecom` farklı:** 14 Ekim 2026'da repoda olmayan bir sürüm dağıtılmış. Biçim farkı ayıklanınca `main`'de 376, canlıda 873 satır; girdi alanları aynı. Canlıdaki yenilikler:
  - pozun `shot_type` alanına göre kadraj yönergesi
  - kadraja girmeyen ürünlerin üretimden çıkarılması (yakın çekimde ayakkabı ve alt parça)
  - gerçek içerik engellemesinin diğer hatalardan ayrılması
  - belirsiz retlerde manken görselinin yeniden kodlanıp tekrar denenmesi
  - anahtar ve model sırasının yeniden yazılması

  `generate-ecom` repodan dağıtılırsa bu iyileştirmeler müşteri için geri alınır. Bu yüzden canlı sürüm repoya alınana kadar dağıtılmaz (A5). 27 Ekim'de PR #4 ile repoya alındı.
- **JWT.** Dokuz fonksiyonun hepsinde JWT doğrulaması kapalı; her fonksiyon oturumu kendi içinde kontrol ediyor. Komut satırından dağıtımda `--no-verify-jwt` şart, yoksa ayar açılır. v2 fonksiyonları da aynı düzende dağıtılır.
- **Plan (T2): Free; 27 Ekim'de Pro'ya geçildi.** Fonksiyon süresi 150 sn olduğu için kare başına çağrı tasarımı geçerli. Otomatik yedek yok (A6). Kota 500 MB veritabanı, 1 GB dosya ve 5 GB çıkış trafiği; harcama sınırı açık olduğu için kota aşılırsa proje yanıt vermeyebilir.
- **Auth.** Yeni kayıt kapalı, e-posta onayı kapalı, e-posta ile giriş açık; Google kullanılmıyor. MVP'de hesaplar Supabase panelinden elle açılıyor. Site URL ve üç izinli adres Kimlik bölümündeki tabloda. v2'nin önizleme adresi izinli listede yok; şifreyle girişi etkilemez, e-posta bağlantıları için Aşama 4'te eklenir (yalnızca ekleme).

## Ekran → backend eşlemesi

v2'nin 23 ekranından 2'si bugünkü backend'le oldukça hazır, 11'i kısmen hazır, 10'u için yeni tablo ya da fonksiyon gerekiyor. Katalog (manken, poz, arka plan), favoriler, assetler, kayıtlı arka planlar ve üretim motorları hazır. Eksikler: hesap ve marka profili, kayıt ve şifre sıfırlama, arka plan iş katmanı, taslaklar, bildirimler, paketler ve ödeme.

| Ekran (v2) | Okur | Yazar / çağırır | Durum |
| --- | --- | --- | --- |
| Onboarding, hesapsız (`/start`) | — | Cevaplar tarayıcıda tutulur; hesap açılınca `brand_profiles`'a yazılır (yeni). Site okuma: `read-site-v2` (yeni, sonraki aşama) | Yok |
| Kayıt, Google ile kayıt (`/signup`) | — | Supabase Auth kayıt + Google OAuth; `profiles` tetikleyiciyle açılır; `accounts` (yeni: kullanıcı adı, marka, site, paket); deneme kredisi sunucuda yüklenir | Yok |
| Giriş (`/signin`) | `profiles` | Şifreyle giriş var; Google ile giriş ve `/auth/callback` yok | Kısmen |
| Şifre sıfırlama, yeni şifre (`/reset`) | — | Supabase Auth sıfırlama e-postası + yeni şifre; e-posta şablonu ve dönüş adresi | Yok |
| Dashboard (`/`) | `profiles.credits`, son taslak, bildirimler | — | Kısmen |
| Kanvas · ürün yükleme | `assets` ("Assetlerden seç") | Yüklenen görsel depoya (`v2/uploads/...`); kategori, görünüş ve tuck kurulum taslağında | Kısmen |
| Kanvas · kast paneli | `models` (genel + `scope: own`), `model_favorites` | Favori ekle/çıkar. Paket kilidi ve cinsiyet filtresi için `models`'a yeni sütun | Kısmen |
| Kanvas · ortam paneli | `backgrounds` (katalog + kullanıcının kaydettikleri) | Stüdyo/dış mekân filtresi, örnek kare ve paket kilidi için `backgrounds`'a yeni sütun | Kısmen |
| Kanvas · kareler paneli | `poses`, `pose_favorites` | "Pozlarım" için `user_poses` tablosu (yeni); oranlar sabit liste | Kısmen |
| Kanvas · taslak kaydı | `setups` (yeni) | Her değişiklikte `setups`'a yazar | Yok |
| Kanvas · Üret | `jobs` (yeni) | `start-run-v2` (yeni) → mevcut üretim fonksiyonları | Yok |
| İşlerim (`/jobs`) | `jobs`, `setups` (yeni) | — | Yok |
| Sonuç sayfası (`/jobs/[id]`) | `jobs`, `job_frames` (yeni), `generation_images` (imzalı adres) | İndirme → `downloads`; Beğendim → `frame_feedback` (yeni); Beğenmedim → `frame_reviews` (yeni) | Kısmen |
| Kareyi düzenle | — | `generate-edit` | Var |
| Arkaplanı / Pozu kaydet | — | Arka plan: `backgrounds` (`source: user`, mevcut desen). Poz: `user_poses` (yeni) | Kısmen |
| Kütüphane (`/library`) | `models` (kendi), `backgrounds` (kendi) | Kast adını değiştir, kaldır | Kısmen |
| Cast Studio (`/studio`) | — | `cast-studio-v2` (yeni); `models` (`scope: own`, `source: user`, münhasırlık yeni sütun); referans inceleme kuyruğu | Yok |
| Paketler (`/packages`) | `plans` (yeni) | Abonelik ve ek kredi satın alma: ödeme sağlayıcısı seçilmedi | Yok |
| Profil (`/profile`) | `accounts`, `brand_profiles`, `credit_transactions` | Hesap ve marka düzenleme; bildirim tercihleri `notification_prefs` (yeni); hesap silme | Kısmen |
| Bildirimler | `notices` (yeni) | Okundu işaretle | Yok |
| Salon (`/salon`) | `salon_posts` (yeni) | Paylaş, bildir; v2'de de henüz taklit | Yok |
| Keşfet, örnek setler | Statik dosyalar | — | Var |
| Admin | `models`, `poses`, `backgrounds` (MVP admin'i var); kuyruklar ve "Kimler geliyor" (yeni) | Cast onayı, iade kararı (`refund_credits`), kredi yükleme (`add_credits`), katalog erişimi | Kısmen |

Durum sütunu ilerledikçe güncellenir. Yeni tabloların ayrıntısı "Yeni veri modeli" bölümünde.

**Hesap silme notu:** `generation_images` ve `downloads` tablolarındaki yabancı anahtarlar silme kuralı taşımıyor. Görsel üretmiş bir kullanıcıyı silmek bugün hata verir. Düzeltmek mevcut kısıtları değiştirmek demek (Kural 2); test Supabase'inde denendikten sonra geçiş gününe bırakılır.

## Akış başına üretim sözleşmesi

Altı akışın beşi için motor canlıda zaten var. v2 bunları değiştirmeden çağırır; eksik olan Cast Studio motoru ve arka planda yürüyen iş katmanıdır. Fiyatlar `systems` tablosundan okunur, arayüzde sabit yazılmaz. Bu tablonun canlıda var olduğu henüz doğrulanmadı (envanter, kontrol 2).

| Akış (v2) | Mevcut motor | `systems` kimliği | Fiyat (veritabanı tohum değeri) | v2 ekranındaki fiyat | Durum |
| --- | --- | --- | --- | --- | --- |
| Ghost'tan Kampanyaya | `generate-ecom` | `ghost_to_campaign` | 1 / kare | 1 / kare | Hazır, eşleme gerekli |
| Model Swap | `generate-style-transfer`, `cast_swap` modu | `many_markets` | 1 / kare | 1 / kare | Mod yayınlanmamış commit'te; `-v2` olarak dağıtılacak |
| Look Composer | `generate-ecom`, `system: 'rebuild_shoot'` | `rebuild_shoot` | 2 / kare | 2 / kare | Hazır; ghost adımının ücreti karar bekliyor |
| Flat'ten Ghost'a | `generate-ghost` | `flat_to_form` | 1 / kare | 1 / kare | Hazır |
| 180° Video | `generate-video-submit` + `generate-video-status` | `product_video` | 4 / iş | 4 / iş | Fiyat 4'te birleşti; video dosyası saklanmıyor |
| Batch | `generate-ecom` (ürün başına) | `ghost_to_campaign` | 1 / kare | 1 / kare | Hazır; iş katmanı gerekli |
| Kareyi düzenle | `generate-edit` | yok (kodda sabit 1) | 1 / deneme | 1 / deneme | Hazır; kalite hatasının düzeltmesi 27 Ekim'de dağıtıldı (T4) |
| Cast Studio | yok | yok | — | 1 / deneme, münhasırlık 30 | Yeni fonksiyon gerekli |

Tohum değerleri `supabase/schema/c1-sistemler.sql` dosyasından; canlıdaki gerçek değerler okunup buraya işlenecek.

_(Diyagram: v2 bağlantı mimarisi. claude.ai'deki asıl dokümanda; aynı bilgi bu bölümdeki akış tablosunda ve alt başlıklarda.)_

Canlı MVP motorları doğrudan çağırmaya devam eder. v2 aynı motorlara `start-run-v2` üzerinden, kullanıcının kendi oturumuyla gelir; kredi ve kayıt mevcut yoldan yazılır.

### Ortak kurallar

- **Kredi yalnızca başarılı karede düşer.** Mevcut fonksiyonlar önce bakiyeyi kontrol eder, üretir, sonra başarılı kare sayısı kadar `deduct_credits` çağırır. v2 bu yolu değiştirmez.
- **Yanıttaki `creditsCharged` alanına güvenilmez.** Bazı fonksiyonlarda bu değer gerçek düşümle uyuşmuyor (ör. `rebuild_shoot` ile ecom, ghost'ta sabit 1). v2 harcanan krediyi `credit_transactions` kayıtlarından okur.
- **Çıktılar mevcut yola yazılır.** Fonksiyonlar görselleri `outputs/<kullanıcı>/<generation>/` altına ve `generation_images` tablosuna kaydeder; 7 gün sonra `cleanup-expired` siler. Bu, v2'nin "kareler 7 gün saklanır" kuralıyla aynı. v2'nin kendi yüklediği dosyalar (ürün görselleri, Cast Studio, kaydedilen temalar) `v2/` önekine gider.
- **Kalite her zaman 2K.** v2 arayüzü 1K/2K seçimi sunmaz; her fonksiyona `quality: '2k'` gönderilir. Küçük harf bilerek: MVP fonksiyonları yalnızca `'2k'`yi tanır ve Gemini'ye `'2K'` olarak çevirir. Büyük harf `'2K'` gönderilirse kare hata vermeden 1K üretilir. Aşama 3 kabulünde her v2 karesinin `generations.params.quality` değeri `'2K'` olmalı.
- **Örnek setler yapay zekâyı çağırmaz.** Örnek ürünlerin (kaban, gömlek, hırka, elbise) sonuçları önceden üretilip saklanır. Önerilen karar: örnekte üretim ücretsiz ve anında; gerçek maliyet yok.
- **v2 işleri arka planda yürür, mevcut fonksiyonlar beklemeli çalışır.** Kullanıcı sayfadan ayrılabilmeli ve İşlerim'de durumu görebilmeli. Köprü, yeni `start-run-v2` fonksiyonudur: iş kaydını açar, mevcut motoru kare başına kullanıcının oturumuyla çağırır, her sonucu iş kaydına işler. Ayrıntı: "İş yaşam döngüsü" bölümü.
- **İlk kare zinciri (MVP'nin yöntemi).** MVP'nin e-ticaret stüdyosu ilk kareyi `generate-ecom` ile, kalan kareleri o ilk kareden `generate-pose` ile üretir. Böylece manken ve ürün kareler arasında aynı kalır. v2 de aynı yöntemi kullanır: kare başına bir çağrı, aynı anda en fazla 3.
- **Zincirin fiyat etkisi.** `generate-pose` fiyatı `systems`'tan okumaz, kare başına sabit 1 kredi düşer. 1 kredilik akışlarda sonuç aynıdır. Look Composer'da (kare başı 2) ilk kare 2, diğerleri 1 kredi tutar; karar "Açık sorular" bölümünde.

### Ghost'tan Kampanyaya → `generate-ecom`

| v2 alanı | İstek alanı | Not |
| --- | --- | --- |
| Seçilen kast | `model {base64, mimeType}` | Kastın kimlik görseli; v2 kastı bir `models` satırıdır. |
| Ürünler | `clothes[]` | Her ürün bir öğe; en fazla 6 (MVP sınırı). v2 şu an 4 ürüne izin veriyor. |
| Ürün kategorisi | `clothes[].category` | Eşleme: `top` → `top`, `bottom` → `bottom`, `outer` → `outerwear`, `onepiece` → `onepiece`, `shoes` → `shoes`, `acc` → `accessory`. Sunucu `shoes` ve `bottom` değerlerini kadraja göre eleme için kullanır. |
| Ön / Arka / Detay görünüşü | `front` / `back` / `frontDetail` | "Detay (baskı, logo, doku)" → `frontDetail`. Detay görseli varsa sunucu kaliteyi 2K'ya zorlar. |
| Üst içeride / dışarıda | `tuck: 'in' \| 'out'` | Yalnızca üst ve alt birlikteyse gönderilir. |
| Kare (poz) | `poses[] {id, prompt, shot_type}` | v2 poz kimlikleri `poses` kataloğuna eşlenir. Arka poz için `side: 'back'`. |
| Kendi pozum (Partner) | `poses[].prompt` | Kullanıcının cümlesi poz metni olarak gider. |
| Ortam | `backgroundPrompt` ya da `backgroundRef` | v2 ortamı bir `backgrounds` satırıdır. Tarif edilen ortam `backgroundPrompt` olur. |
| Oran | `ratio` | Sunucu doğrulamıyor. 2:3, 4:5, 3:4, 1:1, 9:16 değerlerinin modelde desteklendiği test edilecek. |
| — | `system: 'ghost_to_campaign'` | Açıkça gönderilir. MVP arayüzü bu alanı hiç göndermiyor. |

### Model Swap → `generate-style-transfer` (`cast_swap`)

- Çekim kareleri `frames[]` olarak gider, en fazla 6 (sunucu sınırı da 6). Kast `model` alanına, `modelMode: 'cast_swap'`. `products` gönderilmez: sunucu gönderilirse yine ekliyor ve istem metniyle çelişiyor.
- Çıktı sayısı = yüklenen kare sayısı. Fiyat `many_markets` × başarılı kare.
- **Risk:** `cast_swap` ve çoklu kare yalnızca yayınlanmamış `b8b20ff` commit'inde (dal: `c1/style-transfer-cast-swap`). Mevcut fonksiyonu güncellemek Kural 5'e aykırı. Bu kod `generate-style-transfer-v2` adıyla ayrı dağıtılır.
- **Açık:** v2 bu akışta oran sormuyor; sunucu varsayılanı 2:3. Oranın yüklenen kareden alınması önerilir.
- **Test edilecek:** MVP katalog mankenini `models` kovasından oturumla `download()` ederek alıyor, oysa Betik 4'e göre bu kovada okuma kuralı yok. Supabase herkese açık kovada bunu kurala bakmadan veriyor olabilir. v2 katalog görsellerini kurala bağlı kalmadan açık adresten (`image_url`) okur; ilk Model Swap testinde doğrulanır.

### Look Composer → `generate-ecom` (`rebuild_shoot`)

- Adımlar: çekim yüklenir → isteğe bağlı ghost → kast, ortam, kareler.
- Ghost seçilirse çekim kareleri önce ghost'a çevrilir, sonuçlar `clothes[]` olur. "Atla" seçilirse çekim kareleri doğrudan `clothes[]` olur. Tamamlayıcı parçalar kategorileriyle ek `clothes[]` öğeleridir.
- Fiyat `rebuild_shoot` × başarılı kare (tohum 2).
- **Karar bekliyor:** prototipte bu akıştaki ghost adımı ücretsiz. `generate-ghost` her başarılı çağrıda kendi ücretini (`flat_to_form`) düşüyor. Ücretsiz kalacaksa ücret düşmeyen bir `generate-ghost-v2` gerekir; yalnızca sunucu içinden çağrılabilir olmalı.
- `generate-ghost` düz zeminde çekilmiş ürün için yazılmış. Mankenli çekimde aynı kalitede çalıştığı test edilecek.

### Flat'ten Ghost'a → `generate-ghost`

- Tek görsel (`photo`), ön kare. v2 4 görsele kadar yükletiyor ama tek ghost üretiyor; ek görseller şimdilik gönderilmez.
- Üret ve her "Yeniden üret" ayrı çağrıdır ve ayrı ücretlenir. Bu, prototipteki davranışla aynı. "Onayla" ücret doğurmaz, yalnızca iş kaydını kapatır.

### 180° Video → `generate-video-submit` + `generate-video-status`

- Ön kare `firstFrame`, arka kare `lastFrame`. `resolution: '1080p'`, `duration: 5` (arka kare yalnızca 1080p'de kabul ediliyor).
- Kredi başvuruda değil, durum sorgusunun ilk başarılı yanıtında düşer.
- **Mevcut fonksiyonda düzeltilmesi gerekenler** (canlıya dokunmadan `generate-video-status-v2` ile):
  - Video adresi kaydedilmiyor; ilk başarılı yanıt kaçarsa video bir daha alınamaz. `video_jobs`'a adres sütunu eklenir, dosya depoya kopyalanır.
  - İki eşzamanlı sorgu krediyi iki kez düşebilir. Güncelleme `credits_charged = false` koşulunu taşımalı.
  - `generations.tool` kısıtı canlıda `ai_video` içeriyor (Betik 1, 27 Ekim 2026). Bu düzeltmeden önceki video işlerinin kayıtları geri doldurulmuş mu, ayrıca bakılabilir (bekleyen düzeltme 2b).
- **Fiyat:** 4 kredi / iş (karar 27 Ekim 2026). Veritabanı zaten 4; v2 ekranı 4'e çekildi. Ekran fiyatı yine de `systems`'tan okunur.

### Batch → `generate-ecom` (ürün başına)

- Partner'a özel. Her ürün × her kare ayrı bir çağrı; `start-run-v2` tek iş kaydı altında toplar.
- Prototipteki 20 ürün sınırı sunucuda da uygulanır. Ürün eşleştirme ekranı (eksik ön kare, eşleşmeyen görsel) sunucuda görsel analizi gerektirir; ilk sürümde kullanıcı elle eşler.

### Kareyi düzenle → `generate-edit`

- `images` = düzenlenecek kare, `message` = kullanıcının cümlesi. 1 kredi, başarılıysa.
- **Düzeltildi (T4, 27 Ekim 2026'da dağıtıldı):** fonksiyon `quality` değerini küçük harfle (`1k`) olduğu gibi modele iletiyordu. `fix/edit-photo-quality` dalında artık `generate-ecom` ile aynı eşleme var: `'2k'` → `'2K'`, diğer her değer → `'1K'`. Ayrı bir `generate-edit-v2` gerekmez; düzeltme `main`'e girip dağıtılınca v2 de bu fonksiyonu kullanır.
- Oran listesi bu fonksiyonda dar (1:1, 2:3, 3:4, 4:3); 4:5 ve 9:16 kareler oransiz düzenlenir.

### Cast Studio → yeni `cast-studio-v2`

- Metinle: seçilen özellikler ve/veya serbest cümle → aynı kişinin 4 görünümü. 1 kredi, başarılıysa.
- Referansla: fotoraf + hak beyanı → inceleme kuyruğu. Reşit olmayan, tanınmış kişi, grup fotoğrafı reddedilir; çocuk kastı hiçbir yolla üretilmez.
- "Kullan ve kendi mankenim yap": 30 kredi, kast münhasır olur. Referansla yapılan kast yalnızca münhasır kaydedilebilir.
- Fiyatlar `systems`'a yeni satırlar olarak eklenir (`cast_studio_try`, `cast_exclusive`); Kural 2'ye uygun, mevcut satırlara dokunmaz.

## Yeni veri modeli

v2 için 12 yeni tablo ve mevcut 4 tabloya 15 yeni sütun gerekiyor; hiçbir mevcut sütun değişmiyor. Tüm yeni tablolarda RLS ilk günden açık ve kullanıcı yalnızca kendi satırlarını görür. "Yalnızca sunucu" yazan tablolara arayüz yazamaz; yazım edge function'larda service role ile yapılır.

### Yeni tablolar

| Tablo | Amacı | Ana sütunlar | Yazma izni |
| --- | --- | --- | --- |
| `accounts` | `profiles`'ın yanında hesap bilgisi (1:1) | `user_id` (PK, `auth.users`, silinince sil), `username` (tekil; `^[a-z0-9._]{3,20}$`), `name`, `brand`, `website`, `plan` (`explorer` / `creator` / `partner` / `enterprise`, varsayılan `explorer`), `plan_renews_at`, `cancel_at_period_end` (bool), `onboarded` (bool), `trial_granted_at` (deneme kredisi bir kez), `created_at`, `updated_at` | Kullanıcı kendi ad, marka, site, kullanıcı adı alanlarını bir RPC ile günceller (kullanıcı adı kuralları orada denetlenir). `plan` yalnızca sunucu. |
| `brand_profiles` | Onboarding cevapları (1:1) | `user_id` (PK), `shoot_for` (`own` / `employer` / `agency` / `explore`), `brand_count`, `who` (text\[\]), `ages` (text\[\]), `kid_ages` (text\[\]), `tier`, `style_ids` (text\[\]), `style` (jsonb: `{shoot, pose, light, frame}`), `channels` (text\[\]), `waitlist`, `job`, `job_other`, `why`, `tools` (text\[\]), `site_read`, `prefilled` (text\[\]), `updated_at` | Kullanıcı (kendi satırı) |
| `consents` | İzinlerin kaydı (KVKK): kullanım şartları, haber, araştırma görüşmesi, ortaklık | `id`, `user_id`, `kind`, `granted` (bool), `text_version`, `source` (`signup` / `profile`), `meta` (jsonb; ortaklık izninde şirket adı), `created_at` | Kullanıcı yeni satır ekler, mevcut satırı değiştiremez (geçmiş korunur) |
| `setups` | Kanvas kurulumu = taslak | `id`, `user_id`, `flow`, `item_name`, `state` (jsonb: görsel yolları, ürünler ve kategorileri, tuck, kast, ortam, pozlar, oran, kendi pozları, tarif edilen ortam/poz, ghost atlandı mı, düğüm yerleşimi), `ran` (bool), `created_at`, `updated_at` | Kullanıcı (kendi satırı). Görseller depo yoluyla tutulur, `data:` adresiyle değil. |
| `jobs` | Bir üretim (İşlerim'deki kart) | `id`, `user_id`, `setup_id`, `flow`, `title`, `status` (`queued` / `running` / `done` / `failed` / `cancelled`), `planned`, `done`, `failed`, `credits_spent`, `params` (jsonb anlık görüntü: kast, ortam, pozlar, oran, stil parametreleri, tarif edilen ortam/poz), `cover_path`, `created_at`, `started_at`, `finished_at`, `expires_at` (+7 gün) | Yalnızca sunucu |
| `job_frames` | İşin her karesi ve sürümleri | `id`, `job_id` (silinince sil), `user_id`, `idx`, `pose_key`, `status` (`queued` / `running` / `done` / `failed`), `generation_image_id` (→ `generation_images`), `storage_path`, `error_code`, `credits_charged`, `version`, `parent_frame_id` (düzenleme ve yeniden üretim zinciri), `created_at`, `finished_at` | Yalnızca sunucu |
| `frame_feedback` | Beğendim | `frame_id`, `user_id` (birlikte PK), `liked` (bool), `created_at` | Kullanıcı (kendi satırı) |
| `frame_reviews` | Beğenmedim ve iade talebi | `id`, `frame_id`, `user_id`, `reasons` (text\[\]: `product` / `model` / `framing` / `quality` / `other`), `note`, `status` (`pending` / `refunded` / `declined`), `decided_by`, `decided_at`, `decision_reason`, `refund_amount` | Kullanıcı talep açar; karar yalnızca admin RPC'si (iade `refund_credits` ile, bir kez) |
| `user_poses` | Kullanıcının kaydettiği pozlar ("Pozlarım", Partner) | `id`, `user_id`, `name`, `prompt`, `thumbnail_path`, `source_job_id`, `created_at` | Kullanıcı (kendi satırı) |
| `plans` | Paketler | `id` (`explorer` / `creator` / `partner` / `enterprise`), `name`, `monthly_credits`, `price_usd`, `price_try`, `active` (bool, varsayılan `false`), `sort` | Yalnızca admin. Elif'in yeni fiyatları `active = false` girilir (Kural 6). |
| `notices` | Bildirimler | `id`, `user_id`, `kind` (`done` / `failed` / `salon` / `cast` / `review` / `expiring` / `low`), `title` (jsonb `{tr, en}`), `body` (jsonb), `href`, `read_at`, `created_at` | Sunucu yazar; kullanıcı yalnızca `read_at`'i işaretler |
| `notification_prefs` | Bildirim tercihleri | `user_id`, `kind` (birlikte PK), `panel` (bool), `mail` (bool) | Kullanıcı (kendi satırı) |

Salon paylaşımları (`salon_posts`) ve admin denetim kaydı bu aşamada yok; Salon v2'de de taklit olarak kalır.

### Mevcut tablolara eklenecek sütunlar

Hepsi boş bırakılabilir ya da varsayılan değerlidir; MVP arayüzü ve fonksiyonları bunları görmezden gelir.

| Tablo | Yeni sütun | Tür ve varsayılan | Ne için |
| --- | --- | --- | --- |
| `models` | `min_plan` | text, boş = herkese açık | Paket kilidi (Free / Basic / Pro) |
| `models` | `age_band` | text, boş | Onboarding'deki kast önerisi |
| `models` | `note` | jsonb `{tr, en}`, boş | Kartın alt satırı (ör. "20'ler · buğday ten") |
| `models` | `identity_set` | text\[\], boş | Aynı kişinin diğer açıları; üzerine gelince görünen poz |
| `models` | `exclusive` | bool, `false` | Cast Studio münhasırlığı (30 kredi) |
| `models` | `review_status` | text, boş (`pending` / `approved` / `declined`) | Referansla yapılan kastın incelemesi |
| `models` | `reference_path`, `rights_declared_at` | text / timestamptz, boş | Referans fotoğrafı ve hak beyanı |
| `backgrounds` | `min_plan` | text, boş | Paket kilidi |
| `backgrounds` | `place` | text, boş (`studio` / `outdoor`) | Ortam filtresi |
| `backgrounds` | `example_url`, `style_tags` | text / text\[\], boş | Üzerine gelince örnek kare; onboarding'deki ortam önerisi |
| `poses` | `min_plan` | text, boş | Paket kilidi |
| `video_jobs` | `video_path`, `video_url` | text, boş | Video adresinin saklanması |

Kullanıcı pozları neden `poses`'ta değil: `poses` tablosunda "herkes aktif pozları okuyabilir" kuralı var. Kullanıcı pozları oraya yazılsaydı herkese açılırdı; mevcut kurala da dokunulamaz (Kural 7). Bu yüzden ayrı `user_poses` tablosu.

Kaydedilen arka planlar ise MVP'nin mevcut deseniyle `backgrounds` tablosuna (`source: user`) yazılır. Tablodaki herkese açık okuma kuralı kaldırılmış (Betik 1). Dosyanın kendisi MVP'de herkese açık kovaya gidiyor; v2 onu kapalı `user-assets` kovasına yazar ve imzalı adresle okur (A4).

### `systems` tablosuna eklenecek satırlar

| `id` | Birim | Fiyat | Kaynak |
| --- | --- | --- | --- |
| `cast_studio_try` | job | 1 | Cast Studio denemesi |
| `cast_exclusive` | job | 30 | "Kullan ve kendi mankenim yap" |

`systems` tablosunun canlıda var olduğu doğrulanmadan bu satırlar eklenmez (envanter, kontrol 2).

## İş yaşam döngüsü ve kredi kuralları

Bir v2 işi `queued → running → done` (ya da tüm kareler başarısızsa `failed`) ilerler. Kredi her karede, kare başarıyla geldiğinde mevcut fonksiyonun içinde düşer; başarısız kare ücretsizdir. Tüm kredi hareketleri sunucudadır; arayüz kredi hesaplamaz, yalnızca gösterir.

### `start-run-v2` adım adım

1. Arayüz "Üret"e basılınca `start-run-v2`'yi kurulum kimliğiyle (`setup_id`) çağırır.
2. Fonksiyon denetler:
   - Oturum geçerli mi.
   - Paket kilidi: seçilen kast, ortam ve pozların `min_plan`'ı `accounts.plan`'a uyuyor mu. Partner'a özel özellikler (kendi pozu, tarif edilen ortam/poz, batch) yalnızca Partner'da. Bu kontrol arayüzdeki kilitten bağımsız yapılır; adres çubuğundan ya da eski bir taslağtan gelen seçim de denetlenir.
   - Akışın girdi kuralları (ör. ana üründe ön kare, Model Swap'ta en fazla 6 kare).
   - Bakiye ≥ fiyat × planlanan kare.
3. `jobs` satırını (`running`) ve her kare için `job_frames` satırını (`queued`) açar, iş kimliğini hemen döner. Kullanıcı sayfadan ayrılabilir.
4. Arka planda kareleri üretir:
   - Ghost'tan Kampanyaya, Look Composer ve Batch: ilk kare `generate-ecom` ile, kalan kareler bu ilk kareden `generate-pose` ile.
   - Model Swap: `generate-style-transfer-v2`'ye kare başına bir çağrı. Flat'ten Ghost'a: `generate-ghost`. 180° Video: başvuru ve durum sorgusu.
   - Aynı anda en fazla 3 çağrı.
   - Mevcut fonksiyon kullanıcının kendi oturum anahtarıyla çağrılır. Böylece kredi doğru kullanıcıdan, mevcut yoldan düşer.
   - Her yanıt `job_frames`'e işlenir: başarılıysa `done`, dosya yolu, `generation_image_id`, düşen kredi; başarısızsa `failed` ve hata kodu (`insufficient_credits`, `content_blocked`, `model_busy`, `generation_failed`, `credit_charge_failed`).
5. Son kare bitince iş kapanır: en az bir kare geldiyse `done`, hiçbiri gelmediyse `failed`. `credits_spent` karelerin toplamıdır. `done` ya da `failed` bildirimi yazılır.
6. Arayüz işin durumunu kendi satırlarına abone olarak (Supabase Realtime) ya da 3 saniyede bir sorgulayarak izler.

Süre sınırı (T2): bir edge function en fazla 150 sn (Free) ya da 400 sn (ücretli) çalışır; arka plan işi de buna dahil. Bu yüzden `start-run-v2` işi açıp kareleri tetikler, her kare ise kendi çağrısında üretilir (`run-frame-v2`). İlk kare bitince kalan kareler tetiklenir. Bir kare 10 dakika içinde sonuçlanmazsa zamanlanmış `resume-run-v2` onu bir kez yeniden tetikler, ikinci kez de olmazsa kare `failed` olur ve ücretlendirilmez.

### Kredi kuralları

| Olay | Kredi | Ne zaman, nerede |
| --- | --- | --- |
| Kare başarıyla geldi | Akışın fiyatı (`systems`) | Mevcut fonksiyon içinde, kare geldikten sonra |
| Kare gelmedi | 0 | — |
| Tekrar dene (gelmeyen kare) | Akışın fiyatı | Başarılıysa |
| Yeniden üret (gelen kareyi değiştir) | Akışın fiyatı | Başarılıysa; eski kare `version` zincirinde kalır |
| Kareyi düzenle | 1 | `generate-edit`, başarılıysa |
| Flat'ten Ghost'a: üret, yeniden üret | `flat_to_form` | Her başarılı çağrıda; "Onayla" ücretsiz |
| Look Composer: ghost adımı | Karar bekliyor (0 ya da `flat_to_form`) | "Açık sorular" |
| 180° Video | `product_video` | Durum sorgusu başarıyı ilk gördüğünde, bir kez |
| Cast Studio denemesi | `cast_studio_try` (1) | Başarılıysa |
| Kendi mankenim yap | `cast_exclusive` (30) | Kaydederken. Referanslı kast reddedilirse 30 kredi `refund_credits` ile iade |
| Beğenmedim → kabul | O karenin düşen kredisi geri | Admin kararıyla, `refund_credits`, kare başına en fazla bir kez |
| Örnek setle üretim | 0 | Sonuç önceden üretilmiş |
| Yeni hesap deneme kredisi | Karar bekliyor (prototip 5, MVP 0, MVP fiyat sayfası 3) | Kayıtta sunucuda bir kez (`accounts.trial_granted_at`) |
| Aboneliğin aylık kredisi | `plans.monthly_credits` | Yenilemede; ödeme sağlayıcısı gelene kadar yok |
| Ek kredi paketi | Karar bekliyor (prototip 50 / 150 / 500, MVP 20 / 100) | Ödeme sağlayıcısı gelene kadar admin elle yükler |

### Bilinen boşluklar ve v2'deki önlem

- **Rezervasyon yok.** Bakiye başta kontrol edilir ama ayırılmaz; eşzamanlı işlerde son kareler `credit_charge_failed` ile düşebilir. Müşteri ücretlendirilmez ama yapay zekâ maliyeti boşa gider. İlk aşamada kabul edilir; v2 aynı kullanıcı için aynı anda tek iş çalıştırır.
- **Ücret düştü ama kayıt düştü.** Mevcut fonksiyon krediyi düşüp görseli kaydedemezse görsel yalnızca yanıtta kalır. `start-run-v2` bu durumda görseli yanıttan alıp `v2/` altına kendisi kaydeder; kullanıcı karesini kaybetmez.
- **İade yolu hiç kullanılmamış.** İade şartları sayfası iade vaat ediyor. v2'de iade yalnızca admin kararıyla ve `frame_reviews` üzerinden yapılır.
- **Tek bakiye.** Prototip "önce paket kredisi harcanır, ek kredi yenilemede kalır" diyor; tek bakiyeyle bu mümkün değil. Ya iki ayrı bakiye gerekir ya da metin değişir.
- **Filigran tarayıcıda.** Prototip Free indirmelerde filigranı tarayıcıda basıyor, atlatılabilir. Kalıcı çözüm: Free kullanıcıya dosyayı sunucunun filigranlı vermesi (sonraki aşama).

## Kimlik ve onboarding

v2'nin kayıt, Google ile giriş ve şifre sıfırlama ekranları canlıda yok; Supabase Auth bunları destekler ama ayarları proje genelidir. Yani bir ayarı açmak canlı siteyi de etkiler. Bu yüzden ilk aşamada test hesapları davetle açılır; kayıt geçiş günü açılır.

### Proje geneli Auth ayarları (Kural 13)

| Ayar | Bugün (27 Ekim 2026) | v2 ihtiyacı | Canlıya etkisi | Öneri |
| --- | --- | --- | --- | --- |
| Yeni kayıtlara izin | Kapalı | Açık | Herkes API ile hesap açabilir; 0 krediyle MVP'ye girebilir, "yalnızca davetle" vaadi bozulur | Geçiş gününe kadar kapalı. Test hesapları Supabase'in davet özelliğiyle açılır. |
| Google ile giriş | Kullanılmıyor; MVP'de hesaplar Supabase panelinden açılıyor | Açık | MVP arayüzünde buton yok; etkisi yok. Kayıt kapalıyken yeni Google hesabı açılamaz | Google Cloud'da OAuth istemcisi açılır; önizleme ve canlı adresler izinli listeye eklenir |
| E-posta onayı | Kapalı | Karar bekliyor | Açıksa "kayıttan sonra doğrudan akış" ancak onay bağlantısından sonra olur | Açık; onay bağlantısı kullanıcıyı seçtiği akışa döndürür |
| E-posta gönderimi (SMTP) | Supabase varsayılanı, saatte birkaç e-posta sınırı | Sıfırlama ve onay e-postaları | MVP'nin davet e-postaları da aynı yoldan gider | `request-access`'in zaten kullandığı Resend SMTP olarak bağlanır |
| E-posta şablonları | Varsayılan | Liora dilinde Türkçe/İngilizce | Davet e-postası da aynı şablon ailesinde | Şablonlar Elif onayıyla değişir |
| İzinli yönlendirme adresleri | Site URL `https://atelier.lioralabs.io`; izinli: `https://atelier.lioralabs.io/**`, `liora-ai-studio.vercel.app`, `localhost:3000` | Önizleme alan adı + `/auth/callback` | Ekleme etkilemez; silme etkiler | Yalnızca ekleme (Kural 11) |

### Kayıt sırası

1. Kullanıcı `/start`'ta soruları hesapsız cevaplar; cevaplar yalnızca tarayıcıda durur (`liora-atelier-guest-v1`). Hesap açılmadan sunucuya kişisel veri gitmez.
2. Kayıt: e-posta + şifre (`auth.signUp`) ya da Google (`signInWithOAuth`, dönüş `/auth/callback`). Mevcut tetikleyici `profiles` satırını 0 krediyle açar.
3. Arayüz `complete_signup` RPC'sini çağırır. Parametreler: kullanıcı adı, marka, site, misafir cevapları (JSON), izinler (JSON). RPC tek işlemde:
   - `accounts` satırını açar (kullanıcı adı kuralları ve tekilliği burada denetlenir);
   - cevapları izinli değerler listesine göre doğrulayıp `brand_profiles`'a yazar;
   - her izni `consents`'e ayrı satır olarak yazar (kullanım şartları zorunlu, diğerleri işaretsiz gelir);
   - deneme kredisini bir kez yükler (`trial_granted_at` boşsa).
4. Kullanıcı doğrudan seçtiği akışa ya da örneğe yönlenir (misafir verisindeki `next`). Misafir verisi tarayıcıdan silinir.

Doğrudan `/signup`'a gelen kullanıcı soruları kayıttan sonra `/welcome`'da cevaplar; cevaplar aynı RPC'nin profil güncelleme eşiğiyle yazılır.

### Kullanıcı adı

- Kurallar: 3–20 karakter, yalnızca `a–z`, `0–9`, nokta ve alt çizgi. Türkçe karakter girilirse arayüz düz halini önerir (ör. `melis.doğan` → `melis.dogan`). Aynı kural sunucuda tekrar denetlenir.
- Uygunluk: `username_available(ad)` RPC'si; yazım bitince 450 ms sonra çağrılır, istek sıklığı sınırlanır. Ayrılmış adlar (`admin`, `liora`, `support` vb.) sunucudaki listede.
- Değişiklik: eski ad serbest kalır; geçmiş Salon paylaşımları yeni adı gösterir.

### Giriş, sıfırlama, oturum

- **Giriş:** e-posta + şifre (mevcut). Prototipte "kullanıcı adı ya da e-posta" yazıyor; kullanıcı adıyla giriş, adın var olup olmadığını açığa çıkarabilir. Öneri: ilk sürümde yalnızca e-posta.
- **Şifremi unuttum:** `resetPasswordForEmail(e-posta, { redirectTo: <v2>/reset })`. Google ile açılmış hesapta şifre yoktur; arayüz bunu söyler.
- **Yeni şifre:** bağlantı `/reset`'i Supabase'in tek kullanımlık koduyla açar (prototipteki `?token=` yerine `?code=`). Kod oturuma çevrilir, `updateUser({ password })` ile şifre yenilenir, diğer cihazlardaki oturumlar kapatılır. Süresi dolmuş bağlantı "yeni bağlantı iste" ekranını gösterir.
- **Oturum ve yönlendirme:** v2'de prototipteki `GuestGate` yerine MVP'deki gibi sunucu tarafı kontrol (`proxy.ts`). Oturum gerektirmeyen yollar: `/start`, `/signup`, `/signin`, `/reset`, `/auth/callback`, yasal sayfalar. Oturumu olmayan biri hesap sayfasına girerse `/signup`'a yönlenir.
- **Admin:** mevcut `profiles.role = 'admin'` kullanılır; v2 admin sayfaları da sunucuda bu rolü ister.

### Mevcut müşterinin hesabı

Canlıdaki müşterinin v2'ye girebilmesi için `accounts` satırı gerekir. Geçiş gününden önce mevcut her `profiles` satırı için bir `accounts` satırı eklenir: kullanıcı adı e-postanın ilk kısmından, paket anlaşmaya göre. Bu yalnızca ekleme yapar; MVP etkilenmez. Bakiyesi ve geçmişi olduğu gibi kalır.

## Açık sorular ve karar bekleyenler

28 madde: 6'sı canlı müşteriyi v2'den bağımsız ilgilendiriyor ve önce bakılmalı, 14'ü Elif'in ürün kararı, 8'i backend'in teknik doğrulaması. Karar verilince Durum sütunu değiştirilir ve sonuç ilgili bölüme işlenir.

### Acil: canlıyı ilgilendiren

| # | Konu | Bulgu | Önerim | Karar veren | Durum |
| --- | --- | --- | --- | --- | --- |
| A1 | Kredi fonksiyonlarının çalıştırma izni | `add_credits`, `refund_credits`, `deduct_credits` kimlik kontrolü yapmıyor; izin kaldırılmadıysa giriş yapmış herkes kendine kredi yükleyebilir | Önce yalnızca okuyan kontrol (envanter, kontrol 1). Açıksa `anon` ve `authenticated` için çalıştırma izni kaldırılır. Edge function'lar service role ile çağırdığı için MVP etkilenmez | Elif + backend, Melis onayıyla | Doğrulandı |
| A2 | `systems` tablosu ve bekleyen SQL'ler | Kod `systems`'a bağımlı; tablo dökümde yok. `ai_video` kısıtı ve arka plan sızıntısı düzeltmeleri bekliyor | Canlıda durum okunur (kontrol 2, 4, 5). Eksikse önce bekleyen düzeltmeler, sonra `c1-sistemler.sql`, bu sırayla | Backend | Doğrulandı |
| A3 | Kullanıcı arka planlarının açıkta olması | `backgrounds` tablosunda herkese açık okuma kuralı duruyor; kova da muhtemelen açık. v2'nin "Arkaplanı kaydet" özelliği de bu tabloya yazacak | Bekleyen düzeltme 1 v2 bu özelliği açmadan uygulanır | Elif + backend | Doğrulandı |
| A4 | Kullanıcı dosyaları herkese açık kovalarda | Kullanıcının yüklediği manken fotoğrafları `models`, kaydettiği arka planlar `backgrounds` kovasında; ikisi de herkese açık. Adresler tahmin edilemez ve tablo kayıtları yalnızca sahibine görünüyor, ama adresi bilen herkes dosyayı açabilir. Manken fotoğrafı gerçek bir kişiye ait olabilir (kişisel veri) | Betik 4: başkası listeleyemiyor, dosyalar yalnızca tam adresle açılıyor (15 manken, 3 arka plan); acil değil. v2 yeni kullanıcı dosyalarını kapalı `user-assets` kovasına yazar, imzalı adresle okur. Mevcut dosyaların taşınması ayrı karar: MVP bu dosyaları açık adresle gösteriyor, taşıma MVP'de değişiklik ister; geçişte (Aşama 6) yapılması önerilir | Elif + Melis | Açık |
| A5 | Canlı `generate-ecom` repoda yok | 14 Ekim 2026'da repoda olmayan, yaklaşık 500 satır fazlası olan bir sürüm dağıtılmış (envanterde, panel ve CLI sonucu). Repodan dağıtılırsa müşteri için kadraj ve yeniden deneme iyileştirmeleri geri alınır; v2'nin eşlemesi de eski sürüme göre yazılmış | Elif'e sorulur: o gün hangi koddan dağıttı, yerelde gönderilmemiş değişikliği (ön yüz dahil) var mı. Varsa bir dala gönderir, PR ile `main`'e girer. Yoksa indirilen canlı kod PR ile repoya alınır. **27 Ekim:** Elif canlı sürümü `canli/generate-ecom-14-ekim` dalına gönderdi; çalışan kodu canlıdakiyle birebir aynı, yalnızca açıklama satırları farklı. PR #4 ile aynı gün `main`'e girdi (`faa16ee`); artık dokuz fonksiyonun hepsinde repo ile canlı aynı. Repodan dağıtmak artık güvenli. | Elif + Melis | Doğrulandı |
| A6 | Canlı verinin yedeği yok | Supabase Free planda otomatik yedek yok; Supabase bu planda verinin elle dışa aktarılmasını öneriyor. Kota da dar: 500 MB veritabanı, 1 GB dosya, 5 GB çıkış trafiği; kota aşılırsa proje yanıt vermeyebilir. Kural 4 (veritabanı değişikliğinden önce yedek) bu planda karşılanamıyor | Pro'ya geçiş (25 $/ay): 7 günlük günlük yedek, 8 GB veritabanı, 100 GB dosya, 250 GB trafik, duraklatma yok, 400 sn fonksiyon süresi. Aşama 2'deki ilk veritabanı değişikliğinden önce şart; geçişten sonra ilk yedeğin oluştuğu panelde görülür. 27 Ekim 2026'da Pro'ya geçildi. 30 Ekim kontrolü: günlük yedekler alınıyor, sonuncusu 30 Ekim 01:59 UTC. Listede Pro öncesi yedekler de var (23–27 Ekim); yani "hiç yedek yok" tespiti fazla kesindi, bu yedeklerin Free planda geri yüklenebilir olup olmadığı bilinmiyor | Melis + Elif | Doğrulandı |

### Ürün kararları (Elif)

| # | Konu | Seçenekler | Önerim | Durum |
| --- | --- | --- | --- | --- |
| K1 | Yeni hesabın deneme kredisi | 5 (prototip) · 3 (MVP fiyat sayfası) · 0 (MVP veritabanı) | 5; ilk karenin örnekte değil kendi ürününde denenmesini sağlar | Doğrulandı |
| K2 | 180° Video fiyatı | 4 kredi (karar 27 Ekim 2026). Veritabanı zaten 4; v2 ekranı 4'e çekildi | Tek kaynak `systems`; değer Elif'in | Doğrulandı |
| K3 | Look Composer'da ghost adımı | Ücretsiz (prototip) · görsel başı 1 kredi | Ücretsiz; kare fiyatı 2 zaten içeriyor. Bunun için ücret düşmeyen `generate-ghost-v2` gerekir | Doğrulandı |
| K4 | Look Composer'da ilk kare zinciri fiyatı | İlk kare 2, diğerleri 1 · hepsi 2 | Hepsi 2. Farkı `start-run-v2` `deduct_credits` ile ayrıca düşer; mevcut fonksiyonlar değişmez | Doğrulandı |
| K5 | Paket yapısı | Aylık abonelik (Elif: Basic 30 / $30, Pro 100 / $100) · kredi paketi (MVP: 20 / $24, 100 / $120) · ikisi birlikte | Abonelik + ek kredi; mevcut müşteriye geçiş günü uygulanır | Doğrulandı |
| K6 | Ek kredi paketleri | Prototip 50 / 150 / 500 · MVP 20 / 100 | Fiyatları Elif belirler | Doğrulandı |
| K7 | Paket kredisi ve ek kredi ayrımı | İki bakiye (önce paket harcanır, ek kredi yenilemede kalır) · tek bakiye ve metin değişir | İlk sürümde tek bakiye, metin değişir; iki bakiye ödeme sağlayıcısıyla birlikte | Doğrulandı |
| K8 | Örnek setle üretim | Önceden üretilmiş, ücretsiz · gerçek üretim, ilk kare ücretsiz | Önceden üretilmiş, ücretsiz, anında | Doğrulandı |
| K9 | E-posta onayı | Açık · kapalı | Açık; onay bağlantısı seçilen akışa döndürür | Doğrulandı |
| K10 | Kullanıcı adıyla giriş | Yalnızca e-posta · e-posta ya da kullanıcı adı | İlk sürümde yalnızca e-posta | Doğrulandı |
| K11 | Model Swap'ta oran | Sunucu varsayılanı 2:3 · yüklenen kareden | Yüklenen kareden | Doğrulandı |
| K12 | Ödeme sağlayıcısı | iyzico · PayTR · Stripe · diğer | Türkiye'de faturalama ve TL için yerel sağlayıcı; karar sizin | Doğrulandıpay TR |
| K13 | Mevcut müşterinin geçişi | Tarih, paket, bilgilendirme | Beta adresinde birlikte deneme, sonra alan adı değişimi; eski sürüm bir süre geri dönüş için hazır | Doğrulandı |
| K14 | KVKK metinleri | Aydınlatma metni, izin metinlerinin sürümleri | `consents.text_version` ile sürümlü; metinleri hukuk onaylar | Doğrulandı |

### Teknik doğrulamalar (backend)

| # | Konu | Neden önemli | Durum |
| --- | --- | --- | --- |
| T1 | Hangi fonksiyon sürümleri canlıda | `cast_swap` yayınlanmamış commit'te; `systems` okuyan sürümün dağıtılıp dağıtılmadığı bilinmiyor | Doğrulandı |
| T2 | Edge function arka plan süre sınırı | `start-run-v2`'nin uzun işlerde `resume-run-v2`'ye ihtiyacı buna bağlı | Doğrulandı |
| T3 | Gemini'nin oran desteği | v2 2:3, 4:5, 3:4, 1:1, 9:16 sunuyor; sunucu doğrulamıyor |  |
| T4 | `generate-edit` küçük harf kalite değeri | Model reddediyorsa düzenleme hep düşük kalitede ya da hatalı | Doğrulandı |
| T5 | `generate-ghost`'un mankenli çekimde kalitesi | Look Composer'ın ghost adımı buna bağlı | Açık |
| T6 | `cleanup-expired`'ı neyin tetiklediği | 7 günlük saklama sözü buna bağlı | Doğrulandı |
| T7 | Admin'in markaya atadığı özel mankenler | `image_url` boş, dosya `user-models`'ta; MVP stüdyoları bunları kullanamıyor olabilir. Canlı veri (27 Ekim 2026): admin'in atadığı 11 mankenin hepsinde görsel adresi dolu ve models kovasında; v2 kast paneli şimdilik bunları göstermez (30 Ekim kararı) | Açık |
| T8 | Test Supabase'i | Şemayı migration dosyalarına dökmek; Kural 2'yi esnetecek işler (hesap silme, kısıt düzeltmeleri) burada denenir | Açık |

**Dokümanlardan doğrulananlar (27 Ekim 2026):**

- **T2 · Süre sınırı:** edge function'lar Free planda 150 sn, ücretli planlarda 400 sn çalışır. Arka plan işleri de bu süreye dahil. İstek başına 2 sn işlemci sınırı var, ama ağ üzerinden bekleme buna sayılmaz. Sonuç: 3 karelik bir kampanya bu sınıra yaklaşabilir, batch kesin aşar. Bu yüzden `start-run-v2` her kareyi ayrı bir çağrıda üretir (kare başına bir çalışma); tek çağrıda tüm işi bitirmeye çalışmaz. Plan bilgisi panelden okunacak. [Kaynak](https://supabase.com/docs/guides/functions/limits)
- **T3 · Oranlar:** Gemini 3 görsel ailesinin listesi 1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9. v2'nin beş oranının (2:3, 4:5, 3:4, 1:1, 9:16) hepsi listede. `gemini-3-pro-image` için tablo açıkça verilmemiş; ilk test üretiminde doğrulanır. [Kaynak](https://ai.google.dev/gemini-api/docs/image-generation)
- **T4 · Küçük harf kalite:** Google'ın dokümanı büyük harf "K" istiyor; `1k` gibi küçük harf reddediliyor. `generate-ecom` ve `generate-style-transfer` arayüzden gelen `'2k'`yi `'2K'`ye çeviriyor, `generate-edit` çevirmiyordu. Reddedilen istek üç kez denenir, sonra yedek modele geçer, o da reddedilir; kullanıcı "model meşgul" görür. Kredi düşmez, çünkü kredi başarıdan sonra düşüyor. Ancak canlı veri Gemini'nin küçük harfi pratikte kabul ettiğini gösteriyor: Haziran–Ekim arasında 18 başarılı düzenleme var (27 Ekim'de okundu). Yani özellik çalışıyordu; düzeltme kodu resmi belgeye uygun hale getirdi ve ileride sıkılaşırsa kırılmasını önler. Düzeltme tek satır: `liora-ai-studio` deposunda `fix/edit-photo-quality` dalında, yerelde commit'lendi (`5350314`), 27 Ekim 2026'da gönderildi ve [PR #2](https://github.com/ellystar/liora-ai-studio/pull/2) açıldı; aynı gün `main`'e girdi ve dağıtıldı (`generate-edit` v25, JWT kapalı kaldı, canlı kod `main` ile birebir). Canlı test geçti: görsel geldi, kredi düştü. [Kaynak](https://ai.google.dev/gemini-api/docs/image-generation)

## Uygulama sırası ve doğrulama

v2 altı aşamada bağlanır. Her aşama bir öncekinin kabul kontrolleri geçmeden başlamaz. Aşama 0–5 boyunca canlı müşteri hiçbir değişiklik görmez; görünen ilk değişiklik Aşama 6'daki geçiştir. Tarih verilmedi; süreler kararlar netleşince eklenir.

_(Diyagram: uygulama sırası, 7 aşama. Aşamaların kendisi ve kabul kontrolleri aşağıda.)_

Aşama 0–5 boyunca canlı site değişmez. Her elmas, o aşamanın kabul kontrolleri geçmeden bir sonrakine geçilmediğini gösterir.

### Aşama 0 · Hazırlık

**Tamamlandı · 27 Ekim 2026.** Canlı kontrol edildi (Betik 1–4, panel, CLI); acil açık yok. Supabase Pro'ya geçildi. "Fotoğrafı düzenle" (PR #2) ve indirme düzeltmesi (PR #3) canlıda, ikisi de müşteri ortamında denendi. Canlı `generate-ecom` repoya alındı (PR #4); dokuz fonksiyonun hepsinde repo ile canlı aynı. `main` korumasını Elif açtığını bildirdi; ayarın kendisi doğrulanmadı. `v2` dalı yerelde hazır, henüz gönderilmedi. Önizleme koruması (Standard Protection) ve Supabase değişkenleri (Production ve Preview) doğrulandı; `v2` aynı gün gönderildi (`0bcc9c6`). Önizleme açıldı ve korumalı. Test hesabı: `melis@lioralabs.io` (rolü `user`, admin değil; müşterinin gördüğünü görür), ayrı hesap açılmadı. Not: `lib/supabase` istemcileri v2'de kökte değil `src/lib/supabase` altında, Aşama 1'de paketleriyle birlikte geri gelir.

- Acil kontroller (A1–A3) yapılır; sonuçlar envantere işlenir.
- `main` için branch protection açılır.
- Yayınlanmamış `c1/style-transfer-cast-swap` dalı GitHub'a gönderilir. Yalnızca önizleme oluşur, canlı etkilenmez; commit kaybolma riskinden çıkar.
- `v2` dalı açılır. Bu dalda Next.js arayüzü `atelier-proto` ile değiştirilir; `supabase/` klasörü ve `lib/supabase/` istemcileri aynen korunur.
- Vercel önizleme değişkenleri ve kimlik koruması ayarlanır (Kural 10). Önizleme alan adı Supabase yönlendirme listesine eklenir (Kural 11).
- Test hesapları davetle açılır; krediyi admin elle yükler.

**Kabul:** önizleme adresi açılıyor; test hesabıyla giriş yapılıyor; canlı sitede giriş, çekimler ve bakiye kontrolü temiz.

#### Adım 1 · Canlı kontrol (yalnızca okur, hiçbir şeyi değiştirmez)

A1–A4 ve T1, T2, T4, T6, T7 bu adımla doğrulanır. Supabase panelini Elif açar. Betik 1 ona 27 Ekim 2026'da iletildi, sonucu aynı gün geldi.

1. Supabase panelinde projeyi aç: SQL Editor → New query.
2. Aşağıdaki betikleri sırayla yapıştır, Run'a bas. Betikler yalnızca `select` içerir.
3. Her betikten dönen sonucu kopyalayıp Claude'a gönder. Sonuçlarda gizli anahtar yer almaz.

**Betik 1 · Tek sonuç hücresi döner**

```sql
-- Liora v2 · Aşama 0 · Betik 1 — yalnızca okur
select json_build_object(
  'kredi_fonksiyon_izinleri', (
    select json_agg(json_build_object(
      'fonksiyon', p.proname,
      'anon', has_function_privilege('anon', p.oid, 'execute'),
      'authenticated', has_function_privilege('authenticated', p.oid, 'execute')))
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('add_credits', 'refund_credits', 'deduct_credits',
                        'admin_user_id_by_email', 'admin_email_by_user_id')),
  'systems_tablosu', to_regclass('public.systems')::text,
  'generations_system_sutunu', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'generations' and column_name = 'system'),
  'generations_tool_kisiti', (
    select pg_get_constraintdef(oid) from pg_constraint
    where conname = 'generations_tool_check' limit 1),
  'backgrounds_kurallari', (
    select json_agg(json_build_object('kural', policyname, 'roller', roles, 'komut', cmd))
    from pg_policies where schemaname = 'public' and tablename = 'backgrounds'),
  'rls_kapali_tablolar', (
    select json_agg(c.relname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  'depolama_kovalari', (
    select json_agg(json_build_object('kova', id, 'herkese_acik', public))
    from storage.buckets),
  'zamanlanmis_is_tablosu', to_regclass('cron.job')::text
) as sonuc;
```

**Betik 2 · Yalnızca Betik 1'de `systems_tablosu` boş değilse**

```sql
select id, name, unit, price, is_active from public.systems order by sort;
```

**Betik 3 · Yalnızca Betik 1'de `zamanlanmis_is_tablosu` boş değilse**

Zamanlanmış işin komutu gizli anahtar içerebilir; bu yüzden komutun kendisi değil, yalnızca temizlik işi olup olmadığı okunur.

```sql
select jobname, schedule, (command ilike '%cleanup-expired%') as temizlik_isi_mi
from cron.job;
```

**Betik 4 · Depolama kuralları (A4)**

Açık kovalardaki kullanıcı dosyalarını kimin listeleyebildiğini ve kaç dosya olduğunu okur. Dosya adı ya da adres döndürmez.

```sql
-- Liora v2 · Aşama 0 · Betik 4 · yalnızca okur
select json_build_object(
  'depolama_kurallari', (
    select json_agg(json_build_object(
      'kural', policyname, 'roller', roles, 'komut', cmd,
      'kosul', qual, 'yazma_kosulu', with_check))
    from pg_policies
    where schemaname = 'storage' and tablename = 'objects'),
  'acik_kovadaki_kullanici_dosyalari', (
    select json_agg(json_build_object('kova', bucket_id, 'adet', adet))
    from (
      select bucket_id, count(*) as adet
      from storage.objects
      where bucket_id in ('models', 'poses', 'backgrounds')
        and name like 'user/%'
      group by bucket_id) t)
) as sonuc;
```

**Panelden bakılacaklar (SQL gerekmez)**

- [ ] Authentication → Sign In / Providers: yeni kayıtlara izin açık mı; e-posta onayı açık mı; Google açık mı
- [ ] Authentication → URL Configuration: Site URL ve izinli yönlendirme adresleri
- [ ] Edge Functions: her fonksiyonun son dağıtım tarihi (T1)
- [ ] Edge Functions → `generate-edit` (T4): son dağıtım tarihi; Invocations'da son çağrılar 503 mü dönüyor; Code sekmesinde `p_tool: 'edit_photo'` geçiyor mu (geçiyorsa canlıdaki sürüm `main` ile aynı)
- [ ] Settings → Billing: plan (Free / Pro). Arka plan süresi buna bağlı (T2)
- [ ] Database → Backups: otomatik yedek var mı, en son ne zaman (Kural 4)

Betik 1–4'ün sonucu envanterdeki "Canlıda doğrulanması gerekenler" listesinin altına işlendi (27 Ekim 2026); A1–A3 ve T6 doğrulandı, A4 acil değil. Açık kalanlar: panel kontrolleri (T1, T2, T4, Auth, yedekler).

#### Adım 2 · Düzeltmeler (her biri ayrı onayla)

Adım 1'in sonuçlarına göre, bu sırayla. Hiçbiri v2'nin kendisi değil: canlıdaki MVP'ye dokunan, küçük ve geri alınabilir işler. Her biri öncesinde müşteriye haber verilir.

1. **A1 · Kredi izinleri: gerek kalmadı.** Betik 1'e göre üç kredi fonksiyonu `anon` ve `authenticated` için zaten kapalı. İsteğe bağlı: iki admin fonksiyonunun `anon` izni kaldırılabilir. `authenticated` izni kalır, çünkü admin paneli bu iki fonksiyonu oturumla çağırıyor. `is_admin()` oturumsuz çağrıyı zaten reddettiği için acil değil.
2. **T4 · Fotoğrafı düzenle.** `fix/edit-photo-quality` dalı gönderildi, [PR #2](https://github.com/ellystar/liora-ai-studio/pull/2) açıldı (27 Ekim 2026). Elif inceleyip `main`'e alır ve fonksiyonu yalnızca adıyla dağıtır: `npx supabase functions deploy generate-edit --project-ref teemolajohctzejbwbrj --no-verify-jwt`. Ön koşullar 27 Ekim 2026'da doğrulandı: canlıdaki `generate-edit` `main` ile aynı, Vercel Production dağıtımı `c896005`. Dağıtmadan önce Adım 1'deki `generate-edit` kontrolüne bakılır. Canlıdaki sürüm `main`'den eskiyse dağıtım 11–12 Eylül'deki düzeltmeleri de taşır: bakiye okuma hatası kontrolü, kredi düşmezse görselin teslim edilmemesi, kaydın doğru sütuna yazılması. Üçü de canlı veritabanıyla uyumlu (`deduct_credits` `p_tool` alıyor). Kabul: bir test düzenlemesi görsel döner, 1 kredi düşer, `credit_transactions`'ta `edit_photo` satırı görünür. Geri alma: commit geri alınır, fonksiyon yeniden dağıtılır. **Durum:** 27 Ekim 2026'da Melis birleştirdi, Claude dağıttı (v25); sürüm, JWT ayarı ve canlı kodun `main` ile aynılığı doğrulandı. Melis'in canlı testi geçti: görsel geldi, kredi düştü.
3. **Dallar.** `c1/style-transfer-cast-swap` 27 Ekim 2026'da gönderildi (yalnızca dal olarak, `main`'e alınmaz), `main` korumaya alınır (yalnızca repo sahibi Elif yapabilir). `v2` dalı yerelde kuruldu (27 Ekim 2026, `0bcc9c6`, ayrı klasör `liora-ai-studio-v2`): prototip taklit veriyle, Supabase'e istek yok; derleme ve 21 sayfa kontrolü temiz. Gönderim önizleme koruması doğrulanınca.
4. **PR #3 · İndirme düzeltmesi.** Elif'in 15 Ekim'de yapıp göndermediği ön yüz düzeltmesi (`hotfix/download-fix`, 10 dosya; fonksiyona, veritabanına ve RLS'ye dokunmuyor). 27 Ekim 2026'da incelendi: bütün indirmeler tek bir yardımcıdan geçiyor, Çekimlerim dosyaları imzalı adresle ek olarak iniyor, geçici adresler 10 sn sonra siliniyor, indirme kaydı indirmeyi bekletmiyor. Eski fonksiyonlara kalan referans yok; tip kontrolü ve derleme temiz. `shoots-page.tsx`'teki tek lint hatası `main`'de de var, bu PR'dan gelmiyor. Vercel önizlemesi oluşmadı: Vercel'in ücretsiz planı ekip dışı bir yazarın commit'ini kurmuyor. Bunun yerine yerelde, canlı veriyle denendi; Çekimlerim'de tek görsel ve toplu (ZIP) indirme çalıştı (27 Ekim 2026). Aynı gün `main`'e girdi (`7badf55`) ve Vercel canlıya kurdu.

### Aşama 1 · Okuma

**Durum · 27 Ekim 2026.** Parça 1 (giriş, bakiye, kredi hareketleri, çıkış) gönderildi (`7475a1b`) ve önizlemede doğrulandı: `melis@lioralabs.io` ile giriş, bakiye 0, kredi hareketlerinde günün üç satırı. Anahtar olmayan ortamda (yerel prototip) arayüz taklit veriyle çalışmaya devam eder. Paket, Aşama 2'de `accounts.plan` gelene kadar Mockup sekmesinden seçilir. **Melis'in kararı, 30 Ekim 2026:** v2'nin tasarımı ve görselleri prototipteki gibi kalır. Eski Atelier'in manken ve ortam görselleri v2'ye çekilmez; gerçek görseller geldiğinde aynı kartlara yerleştirilir. Parça 2 (`2416c78`) bu yüzden geri alındı (`f590b33`). Poz, favori ve asset bağlantıları beklemede; ekranlarda görüneni değiştiren her adım önce Melis'e sorulur. Kast ve poz kartlarındaki düzensiz boy, favori yıldızı sarmalayıcısından geliyordu; 30 Ekim'de düzeltildi (kartlar 235x314).

v2 arayüzü sahte depo yerine gerçek veriyi okur. Yeni tablo yok.

- Oturum ve bakiye (`profiles`), harcama geçmişi (`credit_transactions`).
- Katalog: `models`, `backgrounds`, `poses`; favoriler (`model_favorites`, `pose_favorites`); assetler (`assets`).
- Görseller imzalı adreslerle; admin'in atadığı özel mankenler `user-models`'tan (T7).

**Kabul:** giriş ve bakiye canlıyla aynı; kast, ortam ve kare panelleri prototipin görselleriyle kalıyor. Katalog bağlantısının kabulü, gerçek görseller gelince yeniden yazılır.

### Aşama 2 · Yeni tablolar

**Durum · 30 Ekim 2026.** Dosyalar `v2` dalında hazır (`supabase/migrations`, geri alma `supabase/rollback`), 30 Ekim 2026'da canlıya uygulandı (18/18, Melis kendi terminalinden çalıştırdı). Öncesi/sonrası karşılaştırması temiz: mevcut sütun, kural, kısıt, fonksiyon, fiyat ve satır sayıları değişmedi; 12 yeni tablonun hepsinde RLS açık, kullanıcı satırı yok, paketler kapalı. MVP kontrolü: uygulamadan sonra MVP'de 7 başarılı üretim yapıldı (4 ecom, 3 poz; sonuncusu 4 Kasım 2026). Sınav `supabase/tests/v2-migrations`: canlının tablo yapısıyla bellekte 98 kontrol geçti, bilerek açılan üç güvenlik açığını yakaladı. Canlıda migration kayıt tablosu yok; dosyalar `db push` ile değil tek tek uygulanır. Sözleşmeye eklenenler: `plans.trial_credits`; deneme kredisi ancak Free paket açıkken verilir; `cast_studio_try` ve `cast_exclusive` kapalı girilir; admin okuma kuralları Aşama 5'te eklenir. Açık: `price_try` boş (PayTR), `username_available` oturumsuz çağrılabildiği için istek sınırı Aşama 4'te çözülmeli.

- "Yeni veri modeli" bölümündeki tablolar ve sütunlar, her biri ayrı migration dosyası ve geri alma betiğiyle, yedekten sonra.
- RPC'ler: `complete_signup`, `username_available`, `update_account`.
- `plans` satırları `active = false` girilir.

**Kabul:** migration'larda yalnızca `create` ve `add column` var; RLS testi (bir test hesabı diğerinin satırını okuyamıyor, yazamıyor); MVP kontrolü temiz.

### Aşama 3 · Üretim

- `start-run-v2`, `generate-style-transfer-v2` (Model Swap), `generate-video-status-v2`; K3 kararına göre `generate-ghost-v2`.
- Taslaklar `setups`'a; İşlerim ve sonuç sayfası `jobs` / `job_frames`'ten.
- Kareyi düzenle, tekrar dene, yeniden üret, Beğendim.

**Kabul:** her akış test hesabıyla en az bir kez çalıştırılır. Her işte `jobs.credits_spent` ile `credit_transactions` toplamı birebir tutar. Gelmeyen kare ücretsiz. Sayfadan ayrılıp dönünce iş İşlerim'de doğru durumda.

### Aşama 4 · Kimlik

- Google ile giriş, şifre sıfırlama, SMTP ve e-posta şablonları (Kural 13 onayıyla).
- `/start` cevaplarının `complete_signup` ile hesaba taşınması. Kayıt hâlâ kapalı; davetli test hesaplarıyla denenir.

**Kabul:** `/start` → davetli hesap → cevaplar `brand_profiles`'ta, izinler `consents`'te, deneme kredisi bir kez; şifre sıfırlama uçtan uca; canlıda davet e-postası hâlâ çalışıyor.

### Aşama 5 · Cast Studio, kuyruklar, bildirimler

- `cast-studio-v2`; münhasırlık; referans inceleme kuyruğu.
- Beğenmedim incelemesi ve iade (admin RPC'si).
- `notices` ve tercihler; admin'de "Kimler geliyor".

**Kabul:** iade kare başına bir kez; incelemedeki referans kast üretimde seçilemiyor; reddedilen münhasırlık 30 kredi iade ediyor.

### Aşama 6 · Geçiş

- Ödeme: PayTR (K12; mağaza hesabı onaylı, entegrasyon ayrıntıları bu aşamadan önce netleşir). PayTR süreci: başvuru kabul edildi, entegrasyon belgeleriyle bir hesap tanımlandı; altyapı bağlanır, ardından PayTR'ın test ortamında hem bizim hem PayTR'ın testi yapılır, sorun çıkmazsa canlıya alınır. Canlıda test ödemesi yapılmaz. PayTR'ın kendi testi zaman alabileceği için entegrasyon belgeler gelince Aşama 1–5 ile paralel başlayabilir. Melis'in 27 Ekim 2026 kararı: geçiş tek seferde yapılır ve ilk sürüm tam çıkar (sunucuda iş katmanı, kare inceleme ve iade dahil).
- Yasal sayfalar v2'ye taşınır: gizlilik, kullanım şartları, mesafeli satış sözleşmesi, iade şartları, fiyatlandırma. MVP'de var (`/privacy`, `/terms`, `/mesafeli-satis`, `/iade-sartlari`, `/fiyatlandirma`); PayTR incelemesi ve e-ticaret mevzuatı için şart, giriş yapmadan açılabilmeli.
- Mevcut müşteri için `accounts` satırı; beta adresinde birlikte deneme.
- Kayıt açılır, yeni fiyatlar etkinleşir (Kural 6, 13).
- `v2` → `main` birleştirme; eski sürüm geri dönüş için ayrı bir Vercel projesinde hazır bekler.

**Kabul:** müşteri onayı; geri dönüş bir kez denenmiş; ilk 7 gün günlük kontrol.

### Her aşamada test

- **v2 otomatik testleri:** kritik yollar için tarayıcı testleri (Playwright): `/start` → kayıt → ilk iş; giriş; şifre sıfırlama.
- **Veritabanı testleri:** her yeni tablo için RLS denetimi (iki test hesabıyla).
- **Canlı kontrolü (Kural 12):** giriş, çekimler listesi, bakiye. Canlıda üretim denemesi yapılmaz; maliyet doğurur.
