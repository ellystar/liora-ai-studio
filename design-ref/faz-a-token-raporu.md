# Faz A — Token katmanı raporu

Branch: `faz-a/token-katmani` · Kaynak: `liora-design-system/liora-tokens.css` (v1.0)

Bu faz görsel çıktıyı değiştirmez; yalnızca değerlerin nereden geldiğini değiştirir.
Aşağıda (a) değişen dosyalar, (b) DS'te birebir karşılığı olmayan değerler,
(c) koda gömülü renk kararlarının tam dökümü, (d) karar bekleyen maddeler var.

---

## 1 · Değişen dosyalar

| Dosya | Ne oldu |
|---|---|
| `app/globals.css` | Yeniden yazıldı. DS token dosyası import edildi; create-next-app kalıntıları çıkarıldı. |
| `app/(app)/dashboard.css` | `.atelier` bloğundaki 8 değişken DS token'larına bağlandı (4 tanesi; kalan 4'ü için aşağıya bkz.). Dosyanın geri kalanı (587 satır) değişmedi. |
| `app/layout.tsx` | Kullanılmayan `Geist` / `Geist_Mono` yüklemesi ve `className` içindeki font değişkenleri kaldırıldı. |
| `design-ref/faz-a-token-raporu.md` | Bu dosya (yeni). |

Hiçbir akışa, bileşene, rotaya, edge function'a, veritabanına veya kredi
mantığına dokunulmadı. `npm run build` geçiyor, 23 rotanın hepsi derleniyor.

### `globals.css`'ten çıkarılanlar ve gerekçeleri

| Çıkarılan | Neden güvenli |
|---|---|
| `Geist` + `Geist_Mono` yüklemesi | `font-sans` / `font-mono` sınıfları kod tabanında hiç kullanılmıyor. Tek referans `dashboard.css`'teki `--atelier-ui` fallback zinciriydi; oradan da kalktı. |
| `@theme inline { --color-background / --color-foreground }` | `bg-background` / `text-foreground` sınıfları hiç kullanılmıyor. |
| `:root { --ui }` | `var(--ui)` kullanan 5 dosyanın (`login.css`, `legal.css`, `site-footer.css`, `checkout-modal.css`, `request-access-modal.css`) **hepsi** kendi `--ui`'sini kendi kapsamında tanımlıyor. Bu tanım hiç okunmuyordu. |
| `@media (prefers-color-scheme: dark)` | Sadece `body` zeminini etkiliyordu; aşağıdaki Karar 3'e bkz. |

### `globals.css`'e eklenen tek yeni şey: font hook'ları

DS aileleri `var(--font-display, …)` / `var(--font-ui, …)` / `var(--font-mono, …)`
biçiminde override edilebilir tanımlı. Bu üç değişkene yazılan stack'ler **yeni
değer değil** — `login.css`, `legal.css`, `site-footer.css`, `checkout-modal.css`
ve `request-access-modal.css` dosyalarında birebir aynı stack zaten kullanılıyor.
Tek fark: DS'in varsayılanında olmayan `"Hanken Grotesk"` ara halkası korundu.

---

## 2 · Bulgu 1 — `body { font-family: Arial }` ölü değil, 10 ekranın UI fontu

**Bu maddeyi bilerek uygulamadım.** Talimatta "create-next-app kalıntısı" olarak
geçiyordu; kod tabanında ise canlı bir bağımlılık.

`.atelier` sınıfı yalnızca 5 bileşende var: `navbar`, `home-dashboard`,
`studio-card`, `shoots-page`, `pricing-page`. Aşağıdaki ekranlar bu kapsamın
**dışında** ve UI fontunu `body`'den, yani Arial'den miras alıyor:

```
ecom-studio · shoe-studio · pose-generator · flat-to-ghost · edit-photo
batch-studio · video-studio · style-transfer · assets · admin/* · profile
```

Yani bugün canlıda stüdyoların tamamı Arial ile render ediliyor, marka fontu
Neue Haas Display ile değil.

- `font-family` satırını **silmek**: tarayıcı varsayılanına (serif) düşer — çok daha kötü.
- `var(--font-ui)` **yapmak**: 10 ekran Arial → Neue Haas Display olur. Doğru hedef, ama görsel bir değişiklik ve canlı kullanıcı var.

Faz A'da satır olduğu gibi bırakıldı, üstüne açıklama düşüldü. **Bu tek satır
Faz B'nin en yüksek getirili değişikliği**: tek commit, 10 ekran markanın
fontuna geçer.

---

## 3 · `--atelier-*` eşlemesi — 8 değişkenden 4'ü birebir tutuyor

| Değişken | Mevcut değer | DS karşılığı | Durum |
|---|---|---|---|
| `--atelier-bg` | `#100e0b` | `--liora-ink` `#100e0b` | ✅ birebir → **token'a bağlandı** |
| `--atelier-ease` | `cubic-bezier(.22,1,.36,1)` | `--liora-ease` | ✅ birebir → **token'a bağlandı** |
| `--atelier-display` | `Newsreader, Georgia, "Times New Roman", serif` | `--liora-font-display` | ✅ birebir → **token'a bağlandı** |
| `--atelier-ui` | `Neue Haas, Hanken, var(--font-geist-sans), …` | `--liora-font-ui` | ✅ eşdeğer → **token'a bağlandı** (ilk iki aile aynı; yalnızca hiç ulaşılmayan fallback halkası değişti) |
| `--atelier-text` | `#ede8df` | ≈ `--liora-on-dark` `#efe8da` | ⚠️ **birebir değil** — hex korundu |
| `--atelier-text-2` | `#a39d92` | ≈ `--liora-on-dark-mut` `#a99c86` | ⚠️ **birebir değil** — hex korundu |
| `--atelier-line` | `#26231e` | ≈ `--border-subtle` (ink üzerinde ≈ `#262420`) | ⚠️ **birebir değil** — hex korundu |
| `--atelier-muted` | `#8f8a80` | — | ❌ **karşılığı yok** — hex korundu |

Yorum: uygulamanın koyu paleti DS'in koyu paletiyle **aynı değil, komşu**.
`--atelier-text` farkı gözle ayırt edilemez; `--atelier-text-2` farkı (ΔE ≈ 5)
yan yana konunca görülür. `--atelier-muted` üçüncü bir gri — DS'te ne
`on-dark-mut` ne `content-muted` bu değeri veriyor.

**Karar 1:** bu 4 değeri DS'e hizalayalım mı? Hizalarsak dört satır değişir ve
`.atelier` kapsamındaki her şey (navbar, home, çekimlerim, pricing, kartlar)
markanın tam değerlerine oturur. Onayın gelirse tek commit.

---

## 4 · Gömülü renk kararları — tam döküm

Taranan: `app/` + `components/`, tüm `.tsx` ve `.css`.

```
611  gömülü hex değeri      (54 farklı değer)
721  Tailwind palet sınıfı  (32 farklı sınıf)
────
1332 renk kararı, bunun 40'ı (%3) bir DS değerine birebir denk geliyor
```

### 4.1 · Sıcak gri yerine SOĞUK gri — en büyük sapma

DS'in ilk kuralı: *"Warm, paper-like. Liora is never cool grey."*
Aşağıdaki 15 değer nötr/soğuk gri ve **420 kez** kullanılmış:

| Değer | Adet | Değer | Adet | Değer | Adet |
|---|---|---|---|---|---|
| `#242424` | 81 | `#1c1c1c` | 35 | `#2e2e2e` | 5 |
| `#2a2a2a` | 76 | `#333` | 24 | `#262626` | 2 |
| `#141414` | 65 | `#444` | 15 | `#222` | 2 |
| `#0a0a0a` | 55 | `#3a3a3a` | 11 | `#1f1f1f` | 1 |
| `#161616` | 39 | `#0f0f0f` | 8 | `#101010` | 1 |

Buna Tailwind tarafındaki **666 nötr sınıf** ekleniyor: `text-neutral-500` (120),
`text-neutral-300` (87), `text-neutral-400` (81), `bg-white` (64),
`text-neutral-100` (62), `text-white` (49), `bg-black` (48),
`text-neutral-200` (40), `text-neutral-600` (39), `border-white` (24),
`border-neutral-800/700/600` (28), `bg-neutral-950` (10), `text-gray-400` (6),
`text-black` (3), `bg-neutral-200` (2), `ring-white` (2), `bg-neutral-900` (1).

Toplam **1086 soğuk/nötr renk kararı**. Bunlar DS'e taşınırken tek tek eşlenemez;
rol bazlı karşılık gerekir (`--surface-raised`, `--surface-sunken`,
`--border-subtle`, `--content-secondary` …). Bu, Faz B'nin asıl işi.

### 4.2 · DS'e birebir uyan değerler (40 kullanım)

Bunlar zaten doğru; sadece token'a çevrilecekler.

| Değer | Adet | Token |
|---|---|---|
| `#100e0b` | 12 | `--liora-ink` |
| `#efe8da` | 8 | `--liora-on-dark` |
| `#a99c86` | 7 | `--liora-on-dark-mut` |
| `#f2ede3` | 4 | `--liora-bone` |
| `#c8bca8` | 4 | `--liora-stone` |
| `#6e665a` | 3 | `--liora-text-mut` |
| `#b07a2e` | 2 | `--liora-gold` |

### 4.3 · Sıcak ama DS'te karşılığı olmayan değerler (135 kullanım)

| Değer | Adet | En yakın DS değeri | Not |
|---|---|---|---|
| `#ede8df` | 39 | `--liora-on-dark` `#efe8da` | fark gözle ayırt edilemez |
| `#8f8a80` | 31 | — | **karşılığı yok**, üçüncü gri |
| `#26231e` | 16 | `--border-subtle` ink üzerinde ≈ `#262420` | pratikte aynı |
| `#a39d92` | 6 | `--liora-on-dark-mut` `#a99c86` | ΔE ≈ 5, görülebilir |
| `#3a3530` | 6 | — | **karşılığı yok** (hover çizgisi) |
| `#7e7361` | 4 | — | **karşılığı yok**, `on-dark-mut` ile `text-mut` arası |
| `#1c1914` | 4 | `--liora-ink-2` `#1c1813` | pratikte aynı |
| `#14110c` | 4 | dark `--surface-sunken` `#15110d` | pratikte aynı |
| `#2a2622` | 4 | — | **karşılığı yok** |
| `#57544d` | 3 | — | **karşılığı yok** |
| `#141210` | 3 | — | **karşılığı yok** |
| `#e8e2d8` | 2 | `--liora-bone-2` `#e9e2d5` | pratikte aynı |
| `#c8975a` | 2 | `--liora-gold` `#b07a2e` | **farklı bir altın** — `login.css` + `legal.css` |
| `#c96f4a` | 2 | dark `--state-warning` `#d69f52` | "kredi azaldı" turuncusu |
| `#c8776a` | 1 | `--liora-oxblood-lift` `#cf8076` | yakın |
| `#e0a2a2` | 1 | — | **karşılığı yok** (login hata rengi) |
| `#4a1c1c` | 1 | `--liora-oxblood` `#5c1f29` | **farklı bir bordo** |
| `#6f6b62`, `#3a352f`, `#262420`, `#1a1713`, `#1a1613`, `#10100e` | 1'er | — | **karşılığı yok** |

### 4.4 · Markanın tamamen dışındaki renkler (68 kullanım)

Bunlar Tailwind varsayılan paletinden gelmiş ve DS'te hiçbir karşılıkları yok:

| Renk | Adet | Nerede |
|---|---|---|
| `text-red-400` / `bg-red-600` | 23 | hata mesajları — DS karşılığı `--state-danger` |
| `text-amber-400` / `fill-amber-400` | 15 | favori yıldızı — DS karşılığı `--liora-gold` |
| mor ailesi (`#8b5cf6`, `#6366f1`, `violet-*`) | 13 | `edit-photo` fırça arayüzü |
| mavi ailesi (`#3b82f6`, `#60a5fa`, `#2563eb`, `#1d4ed8`, `sky-*`) | 13 | `pixel-cursor`, `edit-photo` |
| `#7fd6a8` + `#1f3a2c` | 4 | başarı rozeti — DS karşılığı `--state-success` (olive) |

### 4.5 · Dosya başına yoğunluk

| Dosya | Toplam | hex | TW sınıfı |
|---|---:|---:|---:|
| `app/(app)/batch-studio/page.tsx` | 207 | 92 | 115 |
| `app/(app)/ecom-studio/page.tsx` | **202** | 76 | 126 |
| `app/(app)/shoe-studio/page.tsx` | 143 | 55 | 88 |
| `app/(app)/style-transfer/production-screen.tsx` | 92 | 42 | 50 |
| `app/(app)/pose-generator/page.tsx` | 87 | 31 | 56 |
| `app/(app)/edit-photo/page.tsx` | 62 | 24 | 38 |
| `app/(app)/flat-to-ghost/page.tsx` | 62 | 22 | 40 |
| `app/(app)/dashboard.css` | 59 | 59 | 0 |
| `app/(app)/video-studio/page.tsx` | 52 | 22 | 30 |
| `app/(app)/style-transfer/page.tsx` | 44 | 15 | 29 |
| `app/(app)/admin/styles/page.tsx` | 43 | 12 | 31 |
| `app/(app)/admin/models/page.tsx` | 37 | 14 | 23 |
| `app/(app)/admin/poses/page.tsx` | 33 | 5 | 28 |
| `components/shoots-page.tsx` | 31 | 31 | 0 |
| `components/user-model-upload.tsx` | 23 | 9 | 14 |

Pilot olarak seçilen **`ecom-studio` tek başına 202 renk kararı** taşıyor.

---

## 5 · Karar bekleyen 3 madde

**Karar 1 — `--atelier-*` hizalaması.** Bölüm 3'teki 4 değer DS'e çekilsin mi?
(Öneri: evet. `--atelier-muted` için DS'e yeni bir değer eklemen gerekecek.)

**Karar 2 — DS'in iki canlı kuralı.** `liora-tokens.css` yalnız token içermiyor;
iki kuralı render'ı etkiliyor:
- `*:focus-visible { outline: 2px solid gold }` — klavyeyle gezerken odak halkası tarayıcı varsayılanından DS altınına döner. DS bunu şart koşuyor ("never remove it").
- `@media (prefers-reduced-motion: reduce)` — bu tercihi açmış kullanıcılarda animasyonlar durur.

İkisi de erişilebilirlik iyileştirmesi ve DS'in kendi kararı, o yüzden dosyayı
olduğu gibi import ettim. İstersen ikisini de kapatabilirim — tek satır.

**Karar 3 — `body` zemini.** Eski hâli işletim sistemi temasına göre `#ffffff`
veya `#0a0a0a` idi. Uygulamadaki **her** sayfa kabı (`.atelier` sarmalayıcı,
`.login-page`, `.legal-page`) zaten ink zemininde olduğu için `body` de
`--liora-ink`'e alındı. Görünür tek fark: sayfayı aşağı/yukarı esnetirken
(overscroll) çıkan bantta artık beyaz şerit yok. Yükleme anındaki beyaz
parlamayı da kaldırıyor.

---

## 6 · Sıradaki adım için not (Faz B değil, ön hazırlık)

`data-theme="dark"` / `.liora-dark` kancası derlenmiş CSS'te hazır ama
**hiçbir yerde aktif değil** — Faz A'da bilerek açılmadı. Açıldığı anda
`--surface-*`, `--content-*`, `--border-*` rolleri koyu değerlere döner ve
uygulamanın semantik katmanı kullanılabilir hâle gelir. Bu, Faz B'nin ilk adımı.

---

## Ek · Ortamla ilgili, projeyle ilgisiz bir sorun

Bu makinede `npm run build` **Faz A'dan önce de** patlıyordu:

```
Error: Cannot find module '../lightningcss.darwin-x64.node'
```

Sebep: `node_modules` arm64 için kurulmuş (`lightningcss-darwin-arm64`) ama
aktif Node x64 olarak çalışıyor (`v22.22.2`, Rosetta). Doğrulamak için
dokunulmamış ağaçta da build aldım, aynı hatayı verdi.

Geçici çözüm (repoya yazmaz, `package.json`/`package-lock.json` değişmedi):

```bash
npm install --no-save lightningcss-darwin-x64@1.32.0
```

Kalıcı çözümü sen seçmelisin: ya arm64 Node'a geçiş, ya `node_modules`'ı
silip yeniden kurma. Bu düzeltme yapılmadan projeyi lokalde build edemezsin.
