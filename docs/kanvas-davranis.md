# Kanvas — davranış tarifi

Senaryo: **From Ghost to Campaign** → ürün yüklenmiş → cast seçiliyor → ortam seçiliyor → kareler belirleniyor → üretim.
Prototip: `/concepts/e` · karşılaştırma araçları için `/concepts/e?mod` (konsept seçicisi + "Panel: Katman / Bölünmüş (önceki)") · kod: `src/components/concepts/Canvas.tsx`

Görsel referans tek başına yetmediği için bu metin, kanvasın **ne zaman neyi yaptığını** tarif eder. Görünüş değişebilir; buradaki kurallar değişmedikçe deneyim aynı kalır.

## Dört parça

| Parça | Ne işe yarar | Nerede |
|---|---|---|
| **Kanvas** | Liora'nın bu ürün için kurduğu sistem. Kullanıcı kablo çekmez, karar verir. | Tam ekran; panel açılınca **yeri ve ölçeği değişmez** |
| **Seçim paneli** | Seçili adımın seçenekleri; kartlar panelin içinde kayar. | Kanvasın üstünde, sağdan açılan katman (~480–560 px). Genişlik henüz karar değil. |
| **Üretim barı** | İlerleme, kayıt durumu, kredi, tek aksiyon. Kanvastan rol çalmaz. | Ekranın altında, ince bir şerit |
| **Sonuç** | Üretim bitince kanvasa eklenen node. Her üretim yeni bir versiyon. | Akışın sonunda (sağda) |

## Görsel ilkeler

- Mürekkep zemin, kemik tonunda yazı. Altın yalnızca seçilen, açık ya da tamamlanmış şeyde.
- Display serif yalnızca iki başlıkta: proje adı ve adımın sorusu. Geri kalan her şey arayüz yazısıyla.
- Node'larda kutu, gölge ya da rozet yok: bir görsel, bir ad, bir durum.
- Dikiş/yırtık imzası Atelier'in hiçbir yerinde yok. Seçim ince bir altın çerçeveyle, bağlantılar ince düz çizgilerle anlatılır; geçişler yalnızca renk ve opaklık.

## Kanvas yerleşimi

- Sıra sabit: **ürün → cast → ortam → kareler → sonuç.** Yerleşim serbest: kartlar yatay bir hatta dizilmez.
- Karar node'ları ekranın sol ~%60'ında durur; sağdan açılan panel onları örtmez. Yalnızca sonuç bu alanın dışında kalır.
- **Ürün tek büyük görsel**, ekranın odağı. Cast, ortam, kareler ve sonuç daha küçük ve sakin. Ortam yatay (4:3), insanlar dikey (3:4).
- Bağlantılar tek bir ince çizgi. Tamamlanmış ya da şu an açık olan adıma giden ilişki hafif altın; diğerleri neredeyse görünmez.
- Sol üstte proje kimliği: ürün adı, sezon, akış.
- Karar verilmemiş node boş ve sessiz durur; seçeneklerin önizlemesi yok.

## Node durumları

Durum, görselin altındaki satırda yazıyla ve küçük bir noktayla söylenir.

| Durum | Görünüm | Ne zaman |
|---|---|---|
| **Seçim bekliyor** | Boş yüzey, ince çizgi, içi boş nokta | Karar verilmemiş, sırası gelmemiş |
| **Sırada** | İnce altın çizgi, altın yazı | Verilmemiş ilk karar |
| **Hazır** | Seçilen görsel, yeşil yazı | Karar verildi |
| **Kontrol et** | Bordo çerçeve ve kısa not | Seçim artık paketin dışında (ör. Partner'dan Creator'a düşüldü) |
| **Üretiliyor** | Altın, yavaşça yanıp sönen nokta; kareler tek tek belirir | Sonuç üretiliyor |
| **Hazır (sonuç)** | Üç kare, yeşil yazı | Üretim bitti |
| **Önceki kararlar** | Küçük, soluk kart | Daha yeni bir versiyon var |

## Davranış kuralları

1. Ürün yüklenince kullanıcı kanvasa gelir. Ürün **hazır**, cast **sırada**. Bar: "Üç karar ve sistem hazır · Kurmaya başla".
2. Bir node'a tıklamak seçim panelini **kanvasın üstünde** açar. Kanvas kıpırdamaz: node'lar sıkışmaz, yer değiştirmez, küçülmez. Açık node ince altın çerçevelidir; ilerleme alttaki barda görünür kalır.
   - Masaüstünde panel her zaman sağda açılır, taraf değiştirmez. Karar node'ları "ekran − panel − 62 px" alanına göre yerleşir (14 px panel boşluğu + 48 px hava); bu yerleşim yalnızca ekran genişliğine göre değişir, panel açılınca değil. Kareler'in altın çerçevesi ile panel arasında 1440 px'te 51 px, 1280 px'te 48 px kalır.
   - 1200 px'in altında katman yerine **tam ekran seçim adımı** açılır: üstte "← Kanvas" ve akışın küçük özeti (ürün · cast · ortam · kareler · sonuç). Seçilen görsel şeritteki yerine iner; şeritteki adımlara tıklayarak da geçilir. "← Kanvas" ya da son karar kanvasa döndürür; seçimler korunur.
   - Her adımın başında kısa bir sonuç özeti durur: "3 kare üretilecek · 3 kredi". Seçim sırasında sonuç kartı panelin altında kalır; bu kabul edildi.
   - Panelin başında adım ("Ortam 2/3") ve önceki/sonraki okları var: seçim yapmadan komşu adıma geçilebilir.
   - Adım değişince yalnızca panelin içeriği değişir; panel yerinde kalır ve en başa döner.
3. **Tek seçimli** adımlarda (cast, ortam) seçmek yeterlidir. Seçilen kartta altın çerçeve belirir, görsel kanvastaki node'una uçar (~0,6 sn) ve panelde sıradaki karar verilmemiş adım açılır. Verilmemiş karar kalmadıysa panel kapanır.
4. **Çok seçimli** adımlarda (kareler) tek bir "Devam" vardır.
5. Panel bütün seçenekleri iki sütunda gösterir; fazlası panelin içinde kaydırılır. Kartlar küçültülerek sıkıştırılmaz.
6. Hover detay verir, karar vermez: manken kartının üzerine gelince aynı yüz bir editoryal çekimde görünür (yumuşak geçiş, büyütme yok). Mankenin tüm detayı Cast Studio'da yaşar.
7. "Kanvas" butonu, Esc ya da kanvasın boş bir yerine tıklamak paneli kapatır; yapılmış seçimler korunur. Panel açıkken barın aksiyonu gizlenir; bar yalnızca durumu söyler.
8. Kararlar tamamlanınca bar "Üretime hazır · 3 kredi · Üret" der. Üret'e basınca bir **sonuç node'u (v1)** kanvasa eklenir, ilişkiler altına döner, kareler sonuç kartında tek tek belirir.
9. **Hiçbir şey sessizce yeniden çalışmaz.** Üretimden sonra bir karar değişirse bar "Son versiyondan beri kararlar değişti · Yeni versiyon üret" der. Yeni üretim **v2** olarak eklenir; v1 silinmez, "Önceki kararlar" olarak küçülüp kanvasta kalır.
10. Sonuç kartına tıklamak ayrı değerlendirme ekranını açar (karşılaştırma, kabul, yeniden üretme, indirme orada; kanvasta değil).
11. Sonuçtan sonraki olası adım (180° video) yalnızca sonuç kartının altında tek satırla, "yakında" olarak söylenir.

## Paket farkı

- Temel pakette kullanıcı **Liora'nın küratörlü cast ve ortamlarıyla** ilerler. Kanvasta kilit, rozet ya da satır yok.
- Markaya özel kadro ve "Tarif et" gibi serbest tanımlama alanları **yalnızca Partner'a** aittir ve küratörlü listeye karışmaz. Adımın en altında, kendi çerçevesi ve "Partner'a özel" etiketiyle **ayrı bir bölüm** olarak durur.
  - **Cast adımı · Kendi kadron:** Partner'da kullanıcının kendi mankenleri burada seçilebilir. Alt pakette tek satır ("Yalnızca markana ait mankenler") + bir örnek + "Partner'da açılır".
  - **Ortam adımı · Tarif et:** Partner'da kendi cümlesiyle ortam kurar; kurulan ortam bu bölümün içinde belirir, otomatik seçilir ve akış devam eder. Alt pakette tek satır + bir örnek + "Partner'da açılır".
- Markaya özel, kaydedilebilir **Brand System** ayrı bir alandır. Her üretimde yapılan cast/ortam seçimiyle aynı şeymiş gibi sunulmaz ve bu akışa karışmaz.

## Ürünle kapatılacak açık sorular

- Katmanın son genişliği (şu an 480–560 px). Bölünmüş hal karşılaştırma için `?mod` altında duruyor.

- Paketler sayfası henüz yok; kilitli nottan oraya bir bağlantı gerekecek mi?
- Kanvasta kaç versiyon görünür? (Prototipte: son versiyon, bir önceki küçük, daha eskiler "+N".)
- Brand System alanı nerede yaşar ve bu ekrandan oraya nasıl geçilir?
- Mobilde kanvas yerine aynı node'ların dikey listesi.

## Akışlar arası ortak kalıp

Her üretim akışı aynı kanvası ve aynı seçim panelini kullanır. Akış yalnızca hangi node'ları, hangi türde içerdiğini söyler; panelin içeriği node'un türüne göre değişir, davranışı değişmez. İkinci akış olarak **Model Swap** (eski adı: Model Swap) kuruldu: `/concepts/e/recast` (`?mod` ile iki akış arasında geçiş).

**Node türleri**

| Tür | Ne | Panelde |
|---|---|---|
| Girdi | Kullanıcının getirdiği (ürün görselleri, çekim) | Gösterilir, seçilmez |
| Cast | Kim giyiyor | Liora kadrosu + ayrı Partner bölümü (kendi kadron) |
| Ortam | Nerede çekiliyor | Stok ortamlar + ayrı Partner bölümü (tarif et) |
| Kareler | Hangi açılar, hangi oran | Çok seçimli, "Devam" ile onaylanır |
| Kaynaktan | Girdiden alınıp aynen korunan | Gösterilir ve açıklanır; seçilecek bir şey yok |

**Ortak kalanlar (iki akışta birebir aynı)**

- Kanvas düzeni ve davranışı: panel açılınca kıpırdamaz; masaüstünde sağda sabit katman, 1200 px altında tam ekran adım ("← Kanvas" + akış şeridi).
- Seçmek yeterli; görsel node'una (ya da şeritteki yerine) iner, sıradaki karar açılır; karar kalmayınca panel kapanır.
- Adım satırı ("Cast 1/1"), sonuç özeti ("3 kare üretilecek · 3 kredi"), Esc / Kanvas / boş zemine tıklama ile kapanış.
- Cast adımı: aynı Liora kadrosu, aynı hover editoryal, aynı Partner bölümü.
- Node durumları, üretim barı, sonucun versiyon olarak kanvasa eklenmesi, kararlar değişince "Yeni versiyon üret".

**Farklılaşanlar**

| | Ghost'tan Kampanyaya | Model Swap |
|---|---|---|
| Girdi | Ürün (ghost) görselleri | Mankenli çekim, 3 kare |
| Karar sayısı | 3: cast, ortam, kareler | 1: yalnızca cast |
| Ortam | Seçilir (stok ya da Partner'da tarif) | Çekimden gelir, korunur |
| Poz / kareler | Açılar ve oran seçilir | Çekimdeki 3 poz ve ışık korunur |
| Cast sorusu | "Kim giyiyor?" | "Yerine kim giysin?" — poz, ışık ve fon aynı kalır |
| Kare sayısı / kredi | Seçilen açı sayısı | Çekimdeki kare sayısı (hepsi tek seferde) |
| Sonuçtan sonraki adım | 180° video (yakında) | — |
| Ortamı da değiştirmek isterse | — | "Look Composer · yakında" notu |

## İlk 5 dakika (onboarding)

wf-01'in sırası: Kayıt → Hesabın açıldı → tek soru → akış. Ayrı bir anket yok; sorulan tek soru dashboard'unkiyle aynı ("Elinde ne var?").

**Kayıt ve giriş** (`/signup`, `/signup/complete`, `/signin`, `/reset`) — production giriş sayfasının görsel dili: aynı ipek fotoğraf, solda platform cümlesi, sağda tek kart. Geri bildirim alanın altında, solunda çizgi olan tek satır; kutu ya da modal yok.

- **Hesap oluştur (A-F-01/02/03/07/09):** Google ile devam et; ya da e-posta, şifre (en az 8), kullanıcı adı. Kullanıcı adı yazarken küçük harfe çevrilir, kısa bir duraklamadan sonra kontrol edilir; alınmışsa 2–3 uygun ad önerilir. Marka adı ve website kapalı bir satırda durur ("isteğe bağlı · sonra da eklenebilir"); açılınca neden sorulduğu söylenir: Salon'da paylaşınca görünür. Buton, üç alan geçerli olana kadar pasif.
- **Google dönüşü (A-F-10/13):** tek ek ekran — Google'dan gelen ad ve e-posta (düzenlenemez), addan türetilmiş kullanıcı adı (değiştirilebilir), isteğe bağlı marka/website, şart onayı. Aynı e-postayla zaten hesap varsa bu ekran açılmaz.
- **Giriş (A-F-08/06/11):** kullanıcı adı ya da e-posta (wireframe'deki açık not: ikisi de kabul edilir), şifre, "Şifreni mi unuttun?". Google ile giriş doğrudan dashboard'a.
- **Şifre sıfırlama (A-F-06/12):** cevap aynı kolonda gelir. Google ile açılmış hesapta şifre olmadığı söylenir ve Google ile giriş önerilir. (Mock: gmail.com adresi Google hesabı sayılır.)

**Hesabın açıldı (A-F-04/05, `/welcome`)** — dashboard'un ipeği üzerinde bir satır, bir duraksama değil: @kullanıcı adı, "Hesabın açıldı.", "Ücretsiz plan · Explorer · 5 deneme kredisi", Devam. Kutlama modalı yok; paket ve kredi bundan sonra dashboard'da yaşar.

**Tek soru (D-F-20/02/03, `/welcome?step=question`)** — "Elinde ne var?" ve dört cevap, görselleriyle: kullanıcı okumadan tanır. Her cevabın altında nereye götüreceği yazar. Seçmek onboarding'i bitirir ve o cevabın açık tek akışına götürür:

| Cevap | Gittiği yer |
|---|---|
| Ghost çekim | Kampanya kanvası (`/concepts/e`) |
| Mankenli çekim | Recast kanvası (`/concepts/e/recast`) |
| Flat çekim | Ghost (henüz eski akış ekranı) |
| Henüz bir şey yok | Örnek setler (`/explore`) |

"Atla" sağ üstte hep görünür → dashboard (soru orada D-F-05'teki gibi büyük durur). Restyle açılınca "Mankenli çekim"in iki kapısı olacak; o zaman ya kısa bir ikinci soru ya da iki kapı gerekir.

**Kanvasta ilk kez (W-F-03):** her akışta bir kez, sağ üstte üç kısa adım — sistem ne (akışa özel metin), bir node'a dokun (sıradaki node altınla nefes alır), hazır olunca üret (sonuç yeri işaretlenir). "Atla" ya da bir node'a dokunmak kapatır; "Başlayalım" ilk kararı açar. Kimlik satırındaki "Nasıl çalışır?" yeniden açar.

**Örnek setle ilk kare (D-F-18):** "Henüz bir şey yok → Örnek setle dene" → kaban ya da elbise seti kanvası `?sample` ile açar: kimlikte "Örnek set", maliyette "ilk kare ücretsiz". Üretim bitince "Kendi ürününle dene →".

Store'da: `username`, `brand`, `website`, `provider` (kayıt), `onboarded` (soru cevaplandı ya da atlandı), `seenIntro` (akış başına tanıtım). Kayıt, store'u temiz bir ilk oturuma sıfırlar. Mockup panelinde "Entry → sign up / sign in / first question" kısayolları var; ad menüsünde "Çıkış yap" girişe götürür.

## Beş akış, tek kanvas

| Akış | Adres | Node'lar | Kredi |
|---|---|---|---|
| Ghost'tan Kampanyaya | `/concepts/e` | ürün → cast → ortam → kareler | kare başı 1 |
| Model Swap | `/concepts/e/recast` | çekim → cast → ortam (korunur) → poz (korunur) | kare başı 1 |
| Look Composer | `/concepts/e/restyle` | çekim → ghost (onay) → cast → ortam → kareler | kare başı 2 |
| Flat'ten Ghost'a | `/concepts/e/ghost` | flat çekim → ghost (onay) → sonuç | kare başı 1 |
| 180° Ürün Videosu | `/concepts/e/turn` (`?from=campaign`) | kareler → ön → arka → video | 5 sabit |

Yeni node türleri:
- **Onay (ghost):** sistem üretir, kullanıcı bakar; doğruysa onaylar, değilse kareyi yeniden üretir. Ghost akışında yeniden üretim 1 kredi; Restyle'da ücretsiz (ara işlem, W-B-09) ve indirilemez.
- **Seçim (ön/arka):** kareler otomatik seçili gelir; ön ve arka aynı kare olursa uyarı.

Krediler üretim bitince düşer. Yetmiyorsa çubuk "Kredi yetmiyor" der ve `/packages?from=…`'a götürür; yükseltme sonrası "Üretime dön" aynı akışa döner.

## Kanvas görünümü ve zoom

- Node bir plaka: görsel, etiket, durum. Birden çok görselli node'lar yığın olarak görünür.
- Bağlantılar noktalı, köşeleri yumuşak; uçlarında port. Karar verildikçe altına döner.
- Zoom: sol alttaki − / % / +; ⌘/Ctrl + tekerlek ya da trackpad ile imleç noktasına. Tekerlek ya da boş zemini sürüklemek kanvası kaydırır. % butonu ekrana sığdırır. Görünüm yerinden oynayınca hafif bir grid belirir.

## Üretim → İşlerim → sonuç

Kanvasta "Üret" bir iş açar: ekran kapansa da sürer (W-F-14), bitince İşlerim'e düşer, bildirim üretir ve krediyi o an düşer (W-B-07). Sonuç kartı ve "Karelere git" o işin sayfasına (`/jobs/<id>`) gider. Ghost akışında onaylanan ghost doğrudan tamamlanmış iş olarak eklenir. Taslaklar ve "Kurulumu aç" ilgili akışın kanvasını açar.

## Yükleme, taslak ve yerleşim

- **Yükleme (W-F-19…22):** dashboard'dan gelen akışta ürün/çekim node'u boş başlar ("Görselleri bırak"). Görseller node'a, kanvasın herhangi bir yerine ya da panele bırakılır. Ad ve sıraya göre ön/arka/detay… yerleşir; her görselin yeri tek tıkla değişir. Kurala uymayan dosya (görsel değil, 600 px altı, 20 MB üstü, fazla sayı) kendi satırında söylenir. Telefon/flat adlı görsellerde "önce Ghost" önerisi çıkar. Onaylanmadan hiçbir şey üretilmez. Örnek setler, taşınan ghost ve kampanyadan gelen 180° video yüklemesiz açılır. Görseller tarayıcıda 900 px'e küçültülüp saklanır.
- **Taslak (W-F-16, D-F-21/22):** ilk karardan itibaren kurulum kendiliğinden kaydedilir; adres `?draft=` alır, sayfa yenilense de kararlar, görseller ve yerleşim kalır. Kurulum İşlerim'de taslak olarak durur; dashboard'daki "Devam et" ve İşlerim onu kaldığı adımdan açar. Üretim yapılınca taslak listeden çıkar, kurulum işin "Kurulumu aç"ı olarak kalır.
- **Yerleşim (W-F-09 gevşetildi):** node'lar ve sonuç sürüklenerek taşınabilir; bağlamak, silmek ve eklemek kapalı. Sürükleme tıklama sayılmaz. Yerleşim kurulumla saklanır; "Düzeni sıfırla" yerine koyar.
