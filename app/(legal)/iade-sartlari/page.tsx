'use client'

import { LegalEmail, LegalH2, LegalLayout, LegalLi, LegalP, LegalUl } from '@/components/legal-layout'

const LAST_UPDATED = '8 Temmuz 2026'

export default function IadeSartlariPage() {
  return (
    <LegalLayout
      title="Teslimat ve İade Şartları"
      effectiveDate={LAST_UPDATED}
      lastUpdated={LAST_UPDATED}
      active="deliveryReturns"
    >
      <LegalP>
        Bu sayfa, <strong>atelier.lioralabs.io</strong> (&quot;Liora Atelier&quot;) üzerinden satın alınan dijital kredi paketleri ve abonelik planlarına ilişkin teslimat ve iade koşullarını açıklar. Satıcı:{' '}
        <strong>Elif Yıldız – Melis Doğan Adi Ortaklığı</strong> (Gökdere V.D. / VKN 6081844358).
      </LegalP>

      <LegalH2>1. Teslimat</LegalH2>
      <LegalP>
        <strong>1.1.</strong> Liora Atelier üzerinden satılan tüm ürünler <strong>dijital hizmetlerdir</strong>. Fiziksel bir ürün gönderimi, kargo süreci veya teslimat ücreti bulunmaz.
      </LegalP>
      <LegalP>
        <strong>1.2.</strong> Satın alınan krediler, ödemenin güvenli ödeme altyapısı üzerinden onaylanmasının ardından <strong>anında</strong> hesabınıza tanımlanır ve Platform üzerindeki kredi bakiyenizde görüntülenir.
      </LegalP>
      <LegalP>
        <strong>1.3.</strong> Abonelik planlarında dönemsel krediler, her fatura döneminin başında otomatik olarak hesabınıza tanımlanır.
      </LegalP>
      <LegalP>
        <strong>1.4.</strong> Ödemeniz onaylandığı hâlde kredileriniz hesabınıza yansımadıysa, <LegalEmail /> adresine satın alma bilgilerinizle birlikte yazmanız yeterlidir. Krediler en geç 24 saat içinde tanımlanır veya ödemeniz iade edilir.
      </LegalP>

      <LegalH2>2. Kredi Geçerliliği</LegalH2>
      <LegalP>
        <strong>2.1.</strong> Tek seferlik satın alınan kredi paketleri, hesabınız aktif olduğu sürece geçerlidir; <strong>süre sınırı yoktur, kredileriniz yanmaz.</strong>
      </LegalP>
      <LegalP>
        <strong>2.2.</strong> Abonelik kredileri, abonelik aktif olduğu sürece kullanılmayan bakiye dâhil bir sonraki döneme devreder. Abonelik iptal edildiğinde, içinde bulunulan fatura dönemi sonunda kalan abonelik kredileri geçerliliğini yitirir.
      </LegalP>

      <LegalH2>3. İade Koşulları</LegalH2>
      <LegalP>
        <strong>3.1.</strong> Satın alınan krediler, ödeme sonrasında anında ve elektronik ortamda teslim edilen gayrimaddi (dijital) ürün niteliğindedir. Mesafeli Sözleşmeler Yönetmeliği&apos;nin 15/1-(ğ) maddesi uyarınca bu ürünlerde <strong>cayma hakkı bulunmaz</strong> ve krediler hesaba tanımlandıktan sonra <strong>iade yapılmaz</strong>.
      </LegalP>
      <LegalP>
        <strong>3.2.</strong> Satın alma işlemini onaylamadan önce bu husus tarafınıza bildirilir; işlemi onaylamakla cayma hakkınızın bulunmadığını kabul etmiş sayılırsınız.
      </LegalP>
      <LegalP><strong>3.3.</strong> Aşağıdaki hâller iade kapsamındadır:</LegalP>
      <LegalUl>
        <LegalLi>Ödeme alındığı hâlde kredilerin hesabınıza hiç tanımlanamaması (teknik arıza) ve 24 saat içinde giderilememesi</LegalLi>
        <LegalLi>Aynı işlem için mükerrer (çift) tahsilat yapılması</LegalLi>
      </LegalUl>
      <LegalP>
        Bu hâllerde iade, ödemenin yapıldığı karta gerçekleştirilir. Bankanıza bağlı olarak iadenin kartınıza yansıması 3–14 iş günü sürebilir.
      </LegalP>
      <LegalP>
        <strong>3.4.</strong> Yapay zekâ ile üretilen içeriklerin doğası gereği sonuçlar değişkenlik gösterebilir. Üretim işleminin gerçekleşmesi ile hizmet ifa edilmiş sayılır; üretilen sonucun beklentiyi karşılamaması iade sebebi değildir. Teknik bir hata nedeniyle üretimin hiç gerçekleşmemesi ve kredinin düşülmesi hâlinde ilgili kredi hesabınıza iade edilir.
      </LegalP>

      <LegalH2>4. Abonelik İptali</LegalH2>
      <LegalP>
        <strong>4.1.</strong> Aboneliğinizi Platform üzerinden dilediğiniz zaman iptal edebilirsiniz. İptal, bir sonraki dönem yenilemesini durdurur; içinde bulunduğunuz döneme ilişkin ödeme iade edilmez ve dönem sonuna kadar hizmetten yararlanmaya devam edersiniz.
      </LegalP>

      <LegalH2>5. İletişim</LegalH2>
      <LegalP>Teslimat ve iade süreçleriyle ilgili tüm talepleriniz için:</LegalP>
      <LegalP>
        <strong>E-posta:</strong> <LegalEmail />
        <br />
        <strong>Adres:</strong> Derekızık Mah. Hoca Salih Sok. No:27, Kestel / Bursa
      </LegalP>
      <LegalP>Talepleriniz en geç 2 iş günü içinde yanıtlanır.</LegalP>
    </LegalLayout>
  )
}
