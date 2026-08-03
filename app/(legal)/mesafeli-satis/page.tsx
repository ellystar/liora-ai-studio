'use client'

import { LegalEmail, LegalH2, LegalLayout, LegalP } from '@/components/legal-layout'

export default function MesafeliSatisPage() {
  return (
    <LegalLayout
      title="Mesafeli Satış Sözleşmesi"
      effectiveDate="8 Temmuz 2026"
      lastUpdated="8 Temmuz 2026"
      active="distanceSales"
    >
      <LegalH2>Madde 1 — Taraflar</LegalH2>
      <LegalP><strong>SATICI:</strong></LegalP>
      <LegalP>
        <strong>Ticari Unvan:</strong>{' '}Elif Yıldız – Melis Doğan Adi Ortaklığı (&quot;Liora Labs&quot;)
        <br />
        <strong>Vergi Dairesi / VKN:</strong> Gökdere Vergi Dairesi / 6081844358
        <br />
        <strong>Adres:</strong> Derekızık Mah. Hoca Salih Sok. No:27, Kestel / Bursa
        <br />
        <strong>E-posta:</strong> <LegalEmail />
        <br />
        <strong>Web Sitesi:</strong> atelier.lioralabs.io
      </LegalP>
      <LegalP><strong>ALICI:</strong></LegalP>
      <LegalP>
        <strong>Ad Soyad / Unvan:</strong> Sipariş sırasında belirtilen alıcı bilgileri
        <br />
        <strong>E-posta:</strong> Sipariş sırasında belirtilen e-posta adresi
      </LegalP>
      <LegalP>İşbu Sözleşme kapsamında SATICI ve ALICI birlikte &quot;Taraflar&quot; olarak anılacaktır.</LegalP>

      <LegalH2>Madde 2 — Konu</LegalH2>
      <LegalP>
        İşbu Sözleşme&apos;nin konusu, ALICI&apos;nın SATICI&apos;ya ait <strong>atelier.lioralabs.io</strong>{' '}internet sitesi (&quot;Platform&quot;) üzerinden elektronik ortamda sipariş verdiği, Madde 3&apos;te nitelikleri ve satış fiyatı belirtilen dijital hizmetin satışı ve ifası ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri gereğince Tarafların hak ve yükümlülüklerinin belirlenmesidir.
      </LegalP>

      <LegalH2>Madde 3 — Sözleşme Konusu Hizmet, Fiyat ve Ödeme</LegalH2>
      <LegalP>
        <strong>3.1.</strong> Sözleşme konusu hizmet, Platform üzerinden sunulan yapay zekâ destekli görsel ve video içerik üretim hizmetlerinde kullanılmak üzere ALICI&apos;nın hesabına tanımlanan <strong>dijital kredi paketleri</strong> ve/veya <strong>abonelik planlarıdır</strong>.
      </LegalP>
      <LegalP>
        <strong>3.2.</strong>{' '}Satın alınan paketin/planın içeriği, kredi adedi, vergiler dâhil toplam satış fiyatı ve ödeme koşulları, sipariş anında Platform&apos;daki satın alma sayfasında ve sipariş özetinde ALICI&apos;ya gösterilir ve işbu Sözleşme&apos;nin ayrılmaz bir parçasını oluşturur.
      </LegalP>
      <LegalP>
        <strong>3.3.</strong> Ödemeler, <strong>güvenli ödeme altyapısı</strong>{' '}üzerinden kredi kartı/banka kartı ile tahsil edilir. ALICI&apos;nın kart bilgileri SATICI tarafından görüntülenmez ve saklanmaz.
      </LegalP>
      <LegalP>
        <strong>3.4.</strong> İlan edilen fiyatlar güncelleme yapılana kadar geçerlidir. Kampanya ve promosyon fiyatları, belirtilen süre ile sınırlıdır.
      </LegalP>

      <LegalH2>Madde 4 — Hizmetin İfası (Teslimat)</LegalH2>
      <LegalP>
        <strong>4.1.</strong> Sözleşme konusu dijital krediler, ödemenin onaylanmasını takiben <strong>anında ve elektronik ortamda</strong>{' '}ALICI&apos;nın Platform hesabına tanımlanır. Fiziksel teslimat söz konusu değildir; kargo ve teslimat masrafı bulunmaz.
      </LegalP>
      <LegalP>
        <strong>4.2.</strong> Teknik bir aksaklık nedeniyle kredilerin hesaba tanımlanamaması hâlinde ALICI, <LegalEmail /> adresine bildirimde bulunur; SATICI en geç 24 saat içinde kredileri tanımlar veya ödemeyi iade eder.
      </LegalP>
      <LegalP>
        <strong>4.3.</strong>{' '}Krediler, Platform&apos;daki içerik üretim araçlarında kullanılır. Her aracın kredi tüketim miktarı Platform&apos;da ilan edilir.
      </LegalP>

      <LegalH2>Madde 5 — Kredi Geçerliliği ve Abonelik Koşulları</LegalH2>
      <LegalP>
        <strong>5.1. Tek seferlik kredi paketleri:</strong>{' '}Satın alınan krediler, ALICI&apos;nın hesabı aktif olduğu sürece geçerlidir ve süre sınırına tabi değildir.
      </LegalP>
      <LegalP>
        <strong>5.2. Abonelik planları (sunulması hâlinde):</strong>{' '}Abonelik kapsamında her fatura döneminde ALICI&apos;nın hesabına dönemsel krediler tanımlanır. Dönem içinde kullanılmayan krediler, abonelik aktif kaldığı sürece bir sonraki döneme devreder. Aboneliğin ALICI tarafından iptali hâlinde abonelik, içinde bulunulan fatura döneminin sonuna kadar devam eder; dönem sonunda kullanılmamış abonelik kredileri geçerliliğini yitirir.
      </LegalP>
      <LegalP>
        <strong>5.3.</strong> Abonelik, ALICI tarafından Platform üzerinden dilediği zaman iptal edilebilir. İptal, bir sonraki dönem için yenileme yapılmamasını sağlar; içinde bulunulan döneme ilişkin ödeme iade edilmez.
      </LegalP>

      <LegalH2>Madde 6 — Cayma Hakkı</LegalH2>
      <LegalP>
        <strong>6.1.</strong> İşbu Sözleşme konusu hizmet, Mesafeli Sözleşmeler Yönetmeliği&apos;nin 15. maddesinin birinci fıkrasının (ğ) bendi uyarınca <strong>&quot;elektronik ortamda anında ifa edilen hizmetler ve tüketiciye anında teslim edilen gayrimaddi mallar&quot;</strong> kapsamındadır. Bu nedenle, kredilerin ödeme sonrasında anında ALICI&apos;nın hesabına tanımlanması ile birlikte <strong>cayma hakkı bulunmamaktadır</strong>.
      </LegalP>
      <LegalP>
        <strong>6.2.</strong> ALICI, sipariş öncesinde bu hususta bilgilendirildiğini ve satın alma işlemini onaylamakla cayma hakkının bulunmadığını kabul ettiğini beyan eder.
      </LegalP>
      <LegalP>
        <strong>6.3.</strong>{' '}Madde 4.2&apos;de belirtilen, hizmetin hiç ifa edilememesi (kredilerin hesaba tanımlanamaması) hâli bu maddenin istisnasıdır ve ödeme iadesi yapılır.
      </LegalP>

      <LegalH2>Madde 7 — Kullanım Koşulları ve ALICI&apos;nın Yükümlülükleri</LegalH2>
      <LegalP>
        <strong>7.1.</strong>{' '}ALICI, Platform&apos;a yüklediği görsel ve materyaller üzerinde gerekli fikri mülkiyet haklarına veya kullanım izinlerine sahip olduğunu beyan ve taahhüt eder.
      </LegalP>
      <LegalP>
        <strong>7.2.</strong>{' '}ALICI, Platform&apos;u hukuka aykırı, üçüncü kişilerin haklarını ihlal eden, yanıltıcı veya zararlı içerik üretmek amacıyla kullanamaz.
      </LegalP>
      <LegalP>
        <strong>7.3.</strong>{' '}Platform üzerinden ALICI tarafından üretilen içeriklerin kullanım hakkı, satın alınan paket kapsamında ALICI&apos;ya aittir.
      </LegalP>
      <LegalP>
        <strong>7.4.</strong>{' '}Yapay zekâ tabanlı üretim hizmetlerinin doğası gereği üretilen içerikler değişkenlik gösterebilir. Kredi karşılığında hizmet (üretim işlemi) ifa edilmiş sayılır; üretilen sonucun ALICI&apos;nın öznel beklentisini karşılamaması iade sebebi oluşturmaz. SATICI, makul kalite standartlarının sağlanması için gerekli özeni gösterir.
      </LegalP>

      <LegalH2>Madde 8 — Fatura</LegalH2>
      <LegalP>
        Satın alma işlemine ilişkin fatura, ALICI&apos;nın sipariş sırasında bildirdiği bilgiler esas alınarak elektronik ortamda düzenlenir ve ALICI&apos;nın e-posta adresine iletilir.
      </LegalP>

      <LegalH2>Madde 9 — Mücbir Sebep</LegalH2>
      <LegalP>
        Tarafların kontrolü dışında gelişen, öngörülemeyen ve Tarafların yükümlülüklerini yerine getirmesini engelleyen hâller (altyapı sağlayıcılarından kaynaklanan kesintiler dâhil) mücbir sebep sayılır. Bu süre boyunca Tarafların yükümlülükleri askıya alınır.
      </LegalP>

      <LegalH2>Madde 10 — Uyuşmazlıkların Çözümü</LegalH2>
      <LegalP>
        İşbu Sözleşme&apos;den doğan uyuşmazlıklarda, Ticaret Bakanlığı&apos;nca her yıl ilan edilen parasal sınırlar dâhilinde ALICI&apos;nın veya SATICI&apos;nın yerleşim yerindeki <strong>Tüketici Hakem Heyetleri</strong>, bu sınırları aşan uyuşmazlıklarda ise <strong>Tüketici Mahkemeleri</strong> yetkilidir.
      </LegalP>

      <LegalH2>Madde 11 — Yürürlük</LegalH2>
      <LegalP>
        ALICI, Platform üzerinden siparişi onaylamakla işbu Sözleşme&apos;nin tüm koşullarını okuduğunu, anladığını ve kabul ettiğini beyan eder. Sözleşme, siparişin onaylandığı ve ödemenin gerçekleştiği tarihte yürürlüğe girer.
      </LegalP>
    </LegalLayout>
  )
}
