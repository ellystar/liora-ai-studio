# Liora Atelier · v2

Bu dal (`v2`) Liora Atelier'in yeni arayüzü. Canlı MVP (atelier.lioralabs.io) `main` dalından yayınlanır; bu dal
geçiş gününe kadar `main`'e birleştirilmez. Geçiş tek bir PR ile olur.

Ayrıntılı plan, kurallar ve ekran → backend eşlemesi:
[Liora Atelier v2 — Backend Eşleme Sözleşmesi](https://claude.ai/artifact/2DXFxhkfj446VyRqqBHU9r).

## Kurallar

- **Canlı müşteri hiçbir değişikliği geçişten önce görmez.** Supabase projesi (veritabanı, fonksiyonlar, Auth ayarları)
  MVP ile ortaktır ve dala göre ayrılmaz.
- **Veritabanına yalnızca ekleme.** Yeni tablo ve sütunlar migration dosyasıyla eklenir; mevcut tablo, kısıt ve kurallara
  dokunulmaz.
- **Canlı edge function'lar değiştirilmez.** v2'nin ihtiyacı olan her fonksiyon `-v2` adıyla yeni bir fonksiyon olarak
  eklenir ve daima adıyla dağıtılır:
  `npx supabase functions deploy <ad>-v2 --project-ref teemolajohctzejbwbrj`.
  Adsız `functions deploy` bütün fonksiyonları birden dağıtır.
- **Kredi ve fiyatlar** geçişe kadar `systems` tablosundaki değerlerde sabit kalır. v2 akış adlarını kendi metninden
  gösterir; `systems.name` sütununa dokunmaz.
- **Kalite** her fonksiyona küçük harfle gider (`quality: '2k'`); sunucu Gemini'ye `'2K'` olarak çevirir.

## Çalıştırma

```bash
npm ci
npm run dev          # http://localhost:3000
```

Arayüz şu an taklit veriyle çalışır (`src/lib/data.ts`, `src/lib/store.tsx`) ve Supabase'e hiç istek atmaz. Gerçek veri
Aşama 1'den itibaren, okuma ekranlarından başlayarak bağlanır.

Ekranın sol kenarındaki **Mockup** sekmesi demo kontrollerini açar: ilk oturum / dönen kullanıcı, rol, kredi, dil
(EN/TR). Durum tarayıcıda `localStorage`'da tutulur.

## Yapı

- `src/` — arayüz: Next.js 16 App Router, CSS Modules
- `public/` — görseller (Higgsfield ile üretildi; ham PNG'ler repo dışında)
- `docs/` — kanvas davranış notları ve panel ekran kontrolleri
- `supabase/` — MVP'nin edge function'ları ve şema dökümü; Deno kodu, Next derlemesine girmez
- `design-ref/`, `liora-design-system/` — MVP'den kalan tasarım referansları
