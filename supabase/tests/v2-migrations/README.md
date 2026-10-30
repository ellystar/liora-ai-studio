# v2 migration sınavı

`supabase/migrations/*_v2_*.sql` dosyalarını bellekte çalışan bir Postgres'e uygular. Canlıya bağlanmaz.

```bash
cd supabase/tests/v2-migrations
npm install --no-save @electric-sql/pglite@0.2.17
node sinav.mjs
```

Sınar: dosyalarda yalnızca ekleme olması, mevcut sütunların değişmemesi, kullanıcıların birbirinin satırına
erişememesi, sunucuya ait tablolara yazılamaması, RPC kuralları, deneme kredisinin paket kapalıyken verilmemesi,
canlı temizlik işinin çalışması, geri almanın şemayı başlangıç haline döndürmesi.

`canli-yapi.json`: canlının 30 Ekim 2026 tarihli tablo yapısı ve fiyat satırları. Müşteri verisi içermez.
Gerçek auth ve depolama yoktur; canlıya uygulamadan önceki kontrol budur, uygulama sonrası kontrolün yerine geçmez.

Dosyalar canlıda migration kayıt tablosu olmadığı için `supabase db push` ile değil, tek tek uygulanır;
geri alma betikleri `supabase/rollback/` altında, ters sırayla çalıştırılır.
