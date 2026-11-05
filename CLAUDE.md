@AGENTS.md

# Liora Atelier v2 · çalışma kuralları

Bu dosyayı her Claude oturumu okur. Proje 5 Kasım 2026'da Melis'ten Elif'e devredildi.
Güncel durum ve sıradaki adım: `docs/v2/DEVIR.md`. Ayrıntılı plan ve kararlar: `docs/v2/sozlesme.md`.

## Bu repo

- `main` canlı MVP'dir (atelier.lioralabs.io). Vercel her `main` birleştirmesini canlıya kurar. Ücretli bir müşteri kullanıyor.
- `v2` yeni arayüzdür. Geçiş gününe kadar `main`'e birleştirilmez; geçiş tek bir PR ile yapılır.
- Supabase projesi (`teemolajohctzejbwbrj`) MVP ile ortaktır: veritabanı, fonksiyonlar, depolama ve Auth ayarları dala göre ayrılmaz. `v2`'de yaptığın her veritabanı ya da fonksiyon değişikliği canlıdadır.

## Altın kurallar

1. **Canlı müşteri hiçbir değişikliği geçişten önce görmez.**
2. **`main`'e doğrudan commit yok;** her değişiklik PR ile girer.
3. **Veritabanına yalnızca ekleme.** Her değişiklik üç dosyadır: `supabase/migrations/` altında migration, `supabase/rollback/` altında geri alma betiği, `supabase/tests/v2-migrations/sinav.mjs` içinde kontrol. Mevcut tablo, sütun, kısıt ve kurala dokunulmaz.
4. **Canlıya yazmadan önce:** sınav geçmiş olmalı, son günlük yedek kontrol edilmiş olmalı, ne değişeceği ve nasıl geri alınacağı insana anlatılmış ve açık onay alınmış olmalı. `supabase db push` kullanılmaz (canlıda migration kayıt tablosu yok); dosyalar tek tek uygulanır. Uygulamadan sonra canlı salt okunur sorgularla doğrulanır.
5. **Canlı edge function'lar değiştirilmez.** v2'nin ihtiyacı olan her fonksiyon `-v2` adıyla yeni bir fonksiyondur. Dağıtım daima adıyla ve JWT kapalıyla yapılır (canlıdaki dokuz fonksiyonun hepsinde kapalı; oturumu fonksiyon kendisi denetler):
   `npx supabase functions deploy <ad>-v2 --project-ref teemolajohctzejbwbrj --no-verify-jwt --use-api`
   Adsız `functions deploy` bütün fonksiyonları birden dağıtır; asla kullanılmaz.
6. **Fiyat ve kredi:** tek kaynak `systems` tablosu. Geçişe kadar değişmez. `plans` satırları kapalı (`active = false`) kalır; açılmaları geçiş kararıdır.
7. **Kalite değeri** her fonksiyona küçük harfle gider (`quality: '2k'`); sunucu Gemini'ye `'2K'` olarak çevirir. Büyük harf gönderilirse kare hata vermeden 1K üretilir.
8. **v2'nin görünümü Melis'in tasarımıdır.** Görsel, kart, panel, metin ya da düzen değiştiren her adım önce sorulur. Backend bağlanırken prototipin görselleri korunur; eski Atelier'in görselleri v2'ye çekilmez (30 Ekim 2026 kararı). Tasarım revizeleri Melis'ten sonra gelecek.
9. **Gizli bilgi:** anahtar, şifre ve token hiçbir zaman yazdırılmaz, commit'lenmez ya da mesajla gönderilmez. `.env.local` git dışındadır.
10. **Doğrulanmamış şey doğrulandı diye yazılmaz.** Bir kontrol yapılmadıysa "yapılmadı" denir.

## Çalışma biçimi

- Her yanıt: kısa bir "nerede duruyoruz" ve **tek** bir sonraki adım. Aynı anda birden fazla iş istenmez.
- Canlıyı okumak serbesttir, yazmak değil. Canlıya yazan, dağıtan ya da GitHub'a gönderen her iş için önce onay alınır.
- Claude Code'un otomatik modu canlı veritabanına yazmayı engelleyebilir. Bu durumda engel dolanılmaz: ajan ilk hatada duran bir betik hazırlar, insan kendi terminalinde çalıştırır, ajan sonucu salt okunur sorgularla doğrular.
- Her kod değişikliğinden sonra: `npx tsc --noEmit`, `npx eslint .`, `npx next build`. Yeni bir klasörde önce `npx next typegen` (sayfa tipleri üretilir, yoksa `tsc` hata verir).
- Ekran davranışı değiştiyse önizlemede ya da yerelde gerçekten açılıp bakılır; yalnızca derlemenin geçmesi yeterli değildir.
