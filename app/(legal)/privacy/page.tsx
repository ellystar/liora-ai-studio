'use client'

import { LegalEmail, LegalH2, LegalLayout, LegalLi, LegalP, LegalUl } from '@/components/legal-layout'

const LAST_UPDATED = '8 Temmuz 2026'

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Gizlilik Politikası ve Kişisel Verilerin Korunması Aydınlatma Metni"
      effectiveDate={LAST_UPDATED}
      lastUpdated={LAST_UPDATED}
      active="privacy"
    >
      <LegalH2>1. Veri Sorumlusu</LegalH2>
      <LegalP>
        İşbu Gizlilik Politikası, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) uyarınca, veri sorumlusu sıfatıyla{' '}
        <strong>Elif Yıldız – Melis Doğan Adi Ortaklığı</strong> (&quot;Liora Labs&quot; veya &quot;Şirket&quot;) tarafından,{' '}
        <strong>atelier.lioralabs.io</strong>{' '}adresinde sunulan Liora Atelier platformu (&quot;Platform&quot;) kapsamında hazırlanmıştır.
      </LegalP>
      <LegalP>
        <strong>Ticari Unvan:</strong> Elif Yıldız – Melis Doğan Adi Ortaklığı
        <br />
        <strong>Vergi Dairesi / VKN:</strong> Gökdere Vergi Dairesi / 6081844358
        <br />
        <strong>Adres:</strong> Derekızık Mah. Hoca Salih Sok. No:27, Kestel / Bursa
        <br />
        <strong>E-posta:</strong> <LegalEmail />
      </LegalP>

      <LegalH2>2. İşlenen Kişisel Veriler</LegalH2>
      <LegalP>Platform&apos;u kullanmanız sırasında aşağıdaki kişisel verileriniz işlenebilmektedir:</LegalP>
      <LegalUl>
        <LegalLi><strong>Kimlik Bilgileri:</strong> Ad, soyad</LegalLi>
        <LegalLi><strong>İletişim Bilgileri:</strong> E-posta adresi</LegalLi>
        <LegalLi><strong>Hesap Bilgileri:</strong> Kullanıcı hesabı kayıtları, kredi bakiyesi, işlem geçmişi</LegalLi>
        <LegalLi>
          <strong>Fatura ve Ödeme Bilgileri:</strong> Fatura adresi, vergi bilgileri (kurumsal kullanıcılar için), ödeme işlem kayıtları.{' '}
          <strong>Kredi kartı bilgileriniz Şirket tarafından görüntülenmez ve saklanmaz;</strong> ödeme işlemleri, PCI-DSS sertifikalı ödeme kuruluşu altyapısı üzerinden gerçekleştirilir.
        </LegalLi>
        <LegalLi><strong>Kullanım Verileri:</strong> IP adresi, tarayıcı bilgisi, cihaz bilgisi, Platform içi kullanım istatistikleri, çerez verileri</LegalLi>
        <LegalLi><strong>İçerik Verileri:</strong> Platform&apos;a yüklediğiniz ürün görselleri, markaya ait görsel materyaller ve oluşturduğunuz içerikler</LegalLi>
      </LegalUl>

      <LegalH2>3. Kişisel Verilerin İşlenme Amaçları</LegalH2>
      <LegalP>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</LegalP>
      <LegalUl>
        <LegalLi>Üyelik hesabınızın oluşturulması ve yönetilmesi</LegalLi>
        <LegalLi>Platform hizmetlerinin (yapay zekâ destekli görsel ve video üretimi) sunulması</LegalLi>
        <LegalLi>Satın alma, ödeme ve faturalandırma işlemlerinin gerçekleştirilmesi</LegalLi>
        <LegalLi>Mesafeli satış sözleşmesi ve yasal yükümlülüklerin yerine getirilmesi</LegalLi>
        <LegalLi>Kullanıcı desteği sağlanması ve taleplerin yanıtlanması</LegalLi>
        <LegalLi>Platform&apos;un güvenliğinin sağlanması ve kötüye kullanımın önlenmesi</LegalLi>
        <LegalLi>Hizmet kalitesinin ölçülmesi ve iyileştirilmesi</LegalLi>
        <LegalLi>Açık rızanızın bulunması hâlinde ticari elektronik ileti gönderimi</LegalLi>
      </LegalUl>

      <LegalH2>4. Kişisel Verilerin İşlenmesinin Hukuki Sebepleri</LegalH2>
      <LegalP>Kişisel verileriniz, KVKK&apos;nın 5. maddesinde belirtilen aşağıdaki hukuki sebeplere dayanılarak işlenmektedir:</LegalP>
      <LegalUl>
        <LegalLi>Sözleşmenin kurulması veya ifasıyla doğrudan doğruya ilgili olması (m.5/2-c)</LegalLi>
        <LegalLi>Veri sorumlusunun hukuki yükümlülüğünü yerine getirebilmesi için zorunlu olması (m.5/2-ç)</LegalLi>
        <LegalLi>Bir hakkın tesisi, kullanılması veya korunması için veri işlemenin zorunlu olması (m.5/2-e)</LegalLi>
        <LegalLi>İlgili kişinin temel hak ve özgürlüklerine zarar vermemek kaydıyla, veri sorumlusunun meşru menfaatleri için veri işlenmesinin zorunlu olması (m.5/2-f)</LegalLi>
        <LegalLi>Yukarıdaki kapsamlara girmeyen hâllerde açık rızanız (m.5/1)</LegalLi>
      </LegalUl>

      <LegalH2>5. Kişisel Verilerin Aktarılması</LegalH2>
      <LegalP>
        Kişisel verileriniz, yukarıda belirtilen amaçların gerçekleştirilmesi ile sınırlı olmak üzere aşağıdaki taraflara aktarılabilmektedir:
      </LegalP>
      <LegalUl>
        <LegalLi><strong>Ödeme kuruluşu:</strong> Ödeme işlemlerinin gerçekleştirilmesi amacıyla yetkili ödeme ve elektronik para kuruluşu</LegalLi>
        <LegalLi><strong>Barındırma ve altyapı sağlayıcıları:</strong> Platform&apos;un çalışması için gerekli sunucu, veri tabanı ve dağıtım hizmetleri (ör. Supabase, Vercel)</LegalLi>
        <LegalLi><strong>Yapay zekâ hizmet sağlayıcıları:</strong> İçerik üretim hizmetinin sunulabilmesi amacıyla, yüklediğiniz görsellerin işlenmesi için üçüncü taraf yapay zekâ model sağlayıcıları</LegalLi>
        <LegalLi><strong>Yetkili kamu kurum ve kuruluşları:</strong> Hukuki yükümlülüklerin yerine getirilmesi kapsamında</LegalLi>
      </LegalUl>
      <LegalP>
        Altyapı ve yapay zekâ hizmet sağlayıcılarının sunucuları yurt dışında bulunabilmektedir. Bu kapsamda kişisel verileriniz, KVKK&apos;nın 9. maddesinde öngörülen şartlara uygun olarak yurt dışına aktarılabilmektedir. Platform&apos;u kullanarak ve işbu politikayı onaylayarak bu aktarımlar hakkında bilgilendirildiğinizi kabul etmiş olursunuz.
      </LegalP>

      <LegalH2>6. Yüklenen ve Üretilen İçerikler Hakkında</LegalH2>
      <LegalP>
        Platform&apos;a yüklediğiniz ürün görselleri ve marka materyalleri, yalnızca talep ettiğiniz içerik üretim hizmetinin sunulması amacıyla işlenir. Yüklediğiniz içerikler üzerindeki fikri mülkiyet hakları size aittir. Şirket, bu içerikleri hizmetin sunulması dışında bir amaçla kullanmaz, üçüncü taraflarla pazarlama amacıyla paylaşmaz.
      </LegalP>
      <LegalP>
        Platform&apos;da ürettiğiniz görseller, hesabınızdaki çekim arşivinde en fazla <strong>7 (yedi) gün</strong> süreyle saklanır; bu sürenin sonunda otomatik olarak silinir.
      </LegalP>

      <LegalH2>7. Çerezler</LegalH2>
      <LegalP>
        Platform&apos;da, oturum yönetimi ve temel işlevsellik için zorunlu çerezler ile hizmet kalitesini ölçmek amacıyla analitik çerezler (Google Analytics 4) kullanılmaktadır. Tarayıcı ayarlarınız üzerinden çerez tercihlerinizi yönetebilirsiniz; ancak zorunlu çerezlerin devre dışı bırakılması hâlinde Platform&apos;un bazı işlevleri çalışmayabilir.
      </LegalP>

      <LegalH2>8. Kişisel Verilerin Saklanma Süresi</LegalH2>
      <LegalP>
        Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca ve ilgili mevzuatta öngörülen asgari saklama sürelerine (ör. 6563 sayılı Kanun ve vergi mevzuatı kapsamındaki işlem kayıtları) uygun olarak saklanır. Üretilen görsel içerikler ile Platform&apos;daki çekim arşivi kayıtları en fazla <strong>7 (yedi) gün</strong> saklanır. Sürelerin sona ermesi hâlinde verileriniz silinir, yok edilir veya anonim hâle getirilir.
      </LegalP>

      <LegalH2>9. Veri Güvenliği</LegalH2>
      <LegalP>
        Şirket, kişisel verilerinizin hukuka aykırı olarak işlenmesini ve verilere hukuka aykırı erişilmesini önlemek, verilerin muhafazasını sağlamak amacıyla uygun güvenlik düzeyini temin etmeye yönelik gerekli teknik ve idari tedbirleri alır. Platform&apos;a erişim şifreli bağlantı (HTTPS) üzerinden sağlanır ve hesap girişleri davet esaslı, tek kullanımlık doğrulama bağlantısı ile gerçekleştirilir.
      </LegalP>

      <LegalH2>10. KVKK Kapsamındaki Haklarınız</LegalH2>
      <LegalP>KVKK&apos;nın 11. maddesi uyarınca, veri sorumlusuna başvurarak;</LegalP>
      <LegalUl>
        <LegalLi>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</LegalLi>
        <LegalLi>İşlenmişse buna ilişkin bilgi talep etme,</LegalLi>
        <LegalLi>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</LegalLi>
        <LegalLi>Yurt içinde veya yurt dışında verilerin aktarıldığı üçüncü kişileri bilme,</LegalLi>
        <LegalLi>Eksik veya yanlış işlenmişse düzeltilmesini isteme,</LegalLi>
        <LegalLi>KVKK&apos;nın 7. maddesinde öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme,</LegalLi>
        <LegalLi>Düzeltme, silme ve yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,</LegalLi>
        <LegalLi>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme,</LegalLi>
        <LegalLi>Kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</LegalLi>
      </LegalUl>
      <LegalP>
        haklarına sahipsiniz. Bu haklarınıza ilişkin taleplerinizi <LegalEmail /> adresine iletebilirsiniz. Başvurularınız, talebin niteliğine göre en geç 30 (otuz) gün içinde ücretsiz olarak sonuçlandırılır.
      </LegalP>

      <LegalH2>11. Değişiklikler</LegalH2>
      <LegalP>Şirket, işbu Gizlilik Politikası&apos;nı güncelleyebilir. Güncel metin Platform&apos;da yayımlandığı tarihte yürürlüğe girer.</LegalP>
    </LegalLayout>
  )
}
