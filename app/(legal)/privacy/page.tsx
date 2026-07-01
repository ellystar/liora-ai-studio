'use client'

import { LegalEmail, LegalH2, LegalLayout, LegalP } from '@/components/legal-layout'
import { useI18n } from '@/lib/i18n/language-provider'

const ENTITY = 'Liora Labs'
const ADDRESS = 'Kestel/Bursa/Türkiye'

function EnglishPrivacy() {
  return (
    <>
      <LegalP>
        This Privacy Policy explains how <strong>{ENTITY}</strong> (&quot;Liora&quot;, &quot;we&quot;, &quot;us&quot;) collects, uses, and protects information when you use Liora AI Studio (the &quot;Service&quot;). By using the Service you agree to the practices described here.
      </LegalP>

      <LegalH2>1. Who we are</LegalH2>
      <LegalP>
        Liora AI Studio is an invite-only platform that helps fashion and beauty brands create professional product imagery using artificial intelligence. The data controller is {ENTITY}, located at {ADDRESS}. For any privacy question, contact us at <LegalEmail />.
      </LegalP>

      <LegalH2>2. Information we collect</LegalH2>
      <LegalP>
        <strong>Account information.</strong> Your email address and authentication details, created when you are invited to the platform.
      </LegalP>
      <LegalP>
        <strong>Content you upload.</strong> Images of clothing, footwear, products, model references, and any photos you upload or import to generate or edit imagery, together with any notes or instructions you add.
      </LegalP>
      <LegalP>
        <strong>Generated content.</strong> The images the Service produces for you, and a log of each generation (tool used, time, credits consumed).
      </LegalP>
      <LegalP>
        <strong>Billing and credits.</strong> Your credit balance and transaction history. Credit purchases are arranged directly with {ENTITY}; we do not process or store card details on the platform.
      </LegalP>
      <LegalP>
        <strong>Technical data.</strong> Standard log and device data (IP address, browser, timestamps) and essential cookies needed to keep you signed in.
      </LegalP>

      <LegalH2>3. How we use your information</LegalH2>
      <LegalP>
        We use your information to provide and operate the Service, to process your uploaded images and generate or edit imagery, to manage your account, credits, and billing, to maintain security and prevent abuse, to provide support, and to comply with legal obligations. We may use aggregated, non-identifying data to improve the Service.
      </LegalP>

      <LegalH2>4. AI processing and third parties</LegalH2>
      <LegalP>
        To generate and edit images, the content you upload is transmitted to our AI model provider, <strong>Google (Gemini API)</strong>, for processing. We also rely on the following service providers to operate the platform: <strong>Supabase</strong> (authentication, database, and file storage, hosted in the European Union) and <strong>Vercel</strong> (application hosting). These providers process data on our behalf under their respective terms and security commitments.
      </LegalP>
      <LegalP>
        We do not sell your personal data, and we do not use your uploaded content to train our own models.
      </LegalP>

      <LegalH2>5. International transfers</LegalH2>
      <LegalP>
        Some providers, including Google, may process data on servers located outside your country, including outside the European Economic Area and Türkiye. Where this occurs, we rely on appropriate safeguards such as standard contractual clauses.
      </LegalP>

      <LegalH2>6. Data retention</LegalH2>
      <LegalP>
        We keep your account data and content for as long as your account is active. Generation logs are retained for billing and security purposes. When you delete content or close your account, we delete or anonymize the associated data within a reasonable period, except where we must retain it to meet legal, accounting, or security obligations.
      </LegalP>

      <LegalH2>7. Your rights</LegalH2>
      <LegalP>
        Subject to applicable law (including the GDPR and Türkiye&apos;s KVKK), you have the right to access, correct, delete, or export your personal data, to object to or restrict certain processing, and to withdraw consent where processing is based on consent. To exercise these rights, contact <LegalEmail />. You also have the right to lodge a complaint with your local data protection authority.
      </LegalP>

      <LegalH2>8. Security</LegalH2>
      <LegalP>
        We use industry-standard measures, including access controls and encryption in transit, to protect your data. Owner-specific content (such as models assigned to your account or that you upload) is restricted so that only you can access it. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.
      </LegalP>

      <LegalH2>9. Cookies</LegalH2>
      <LegalP>
        We use only essential cookies required to authenticate you and keep your session active. We do not use advertising cookies.
      </LegalP>

      <LegalH2>10. Children</LegalH2>
      <LegalP>
        The Service is intended for businesses and is not directed to individuals under 18. We do not knowingly collect data from children.
      </LegalP>

      <LegalH2>11. Changes to this policy</LegalH2>
      <LegalP>
        We may update this Privacy Policy from time to time. We will post the updated version with a new effective date, and where required we will notify you.
      </LegalP>

      <LegalH2>12. Contact</LegalH2>
      <LegalP>
        {ENTITY}
        <br />
        {ADDRESS}
        <br />
        Email: <LegalEmail />
      </LegalP>
    </>
  )
}

function TurkishPrivacy() {
  return (
    <>
      <LegalP>
        Bu Gizlilik Politikası, Liora AI Studio&apos;yu (&quot;Hizmet&quot;) kullandığınızda <strong>{ENTITY}</strong> (&quot;Liora&quot;, &quot;biz&quot;) tarafından bilgilerin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar. Hizmet&apos;i kullanarak burada açıklanan uygulamaları kabul etmiş olursunuz.
      </LegalP>

      <LegalH2>1. Biz kimiz</LegalH2>
      <LegalP>
        Liora AI Studio, moda ve güzellik markalarının yapay zekâ kullanarak profesyonel ürün görselleri oluşturmasına yardımcı olan, yalnızca davetle erişilen bir platformdur. Veri sorumlusu, {ADDRESS} adresinde bulunan {ENTITY}&apos;dir. Gizlilikle ilgili her türlü soru için <LegalEmail /> adresinden bize ulaşabilirsiniz.
      </LegalP>

      <LegalH2>2. Topladığımız bilgiler</LegalH2>
      <LegalP>
        <strong>Hesap bilgileri.</strong> Platforma davet edildiğinizde oluşturulan e-posta adresiniz ve kimlik doğrulama bilgileriniz.
      </LegalP>
      <LegalP>
        <strong>Yüklediğiniz içerik.</strong> Görsel üretmek veya düzenlemek için yüklediğiniz ya da içeri aktardığınız kıyafet, ayakkabı, ürün, manken referansı görselleri ve fotoğraflar ile eklediğiniz not ve talimatlar.
      </LegalP>
      <LegalP>
        <strong>Üretilen içerik.</strong> Hizmet&apos;in sizin için ürettiği görseller ve her üretimin kaydı (kullanılan araç, zaman, harcanan kredi).
      </LegalP>
      <LegalP>
        <strong>Faturalama ve krediler.</strong> Kredi bakiyeniz ve işlem geçmişiniz. Kredi satın alımları doğrudan {ENTITY} ile yapılır; kart bilgilerini platformda işlemez veya saklamayız.
      </LegalP>
      <LegalP>
        <strong>Teknik veriler.</strong> Standart günlük ve cihaz verileri (IP adresi, tarayıcı, zaman damgaları) ve oturumunuzu açık tutmak için gereken zorunlu çerezler.
      </LegalP>

      <LegalH2>3. Bilgilerinizi nasıl kullanıyoruz</LegalH2>
      <LegalP>
        Bilgilerinizi Hizmet&apos;i sağlamak ve işletmek; yüklediğiniz görselleri işlemek ve görsel üretmek veya düzenlemek; hesabınızı, kredilerinizi ve faturalamanızı yönetmek; güvenliği sağlamak ve kötüye kullanımı önlemek; destek sunmak ve yasal yükümlülüklere uymak için kullanırız. Hizmet&apos;i geliştirmek amacıyla toplulaştırılmış ve kimliği belirlemeyen verileri kullanabiliriz.
      </LegalP>

      <LegalH2>4. Yapay zekâ işleme ve üçüncü taraflar</LegalH2>
      <LegalP>
        Görselleri üretmek ve düzenlemek için yüklediğiniz içerik, işlenmek üzere yapay zekâ model sağlayıcımız <strong>Google&apos;a (Gemini API)</strong> iletilir. Platformu işletmek için ayrıca şu hizmet sağlayıcılara başvururuz: <strong>Supabase</strong> (kimlik doğrulama, veritabanı ve dosya depolama; Avrupa Birliği&apos;nde barındırılır) ve <strong>Vercel</strong> (uygulama barındırma). Bu sağlayıcılar, kendi koşulları ve güvenlik taahhütleri kapsamında verileri bizim adımıza işler.
      </LegalP>
      <LegalP>
        Kişisel verilerinizi satmıyoruz ve yüklediğiniz içeriği kendi modellerimizi eğitmek için kullanmıyoruz.
      </LegalP>

      <LegalH2>5. Uluslararası aktarımlar</LegalH2>
      <LegalP>
        Google dâhil bazı sağlayıcılar, verileri ülkenizin dışında; Avrupa Ekonomik Alanı ve Türkiye dışında bulunan sunucularda işleyebilir. Bu durumda, standart sözleşme hükümleri gibi uygun güvencelere dayanırız.
      </LegalP>

      <LegalH2>6. Veri saklama</LegalH2>
      <LegalP>
        Hesap verilerinizi ve içeriğinizi hesabınız etkin olduğu sürece saklarız. Üretim kayıtları faturalama ve güvenlik amacıyla tutulur. İçeriği sildiğinizde veya hesabınızı kapattığınızda, yasal, muhasebe veya güvenlik yükümlülüklerini yerine getirmek için saklamamız gereken durumlar dışında, ilgili verileri makul bir süre içinde sileriz veya anonimleştiririz.
      </LegalP>

      <LegalH2>7. Haklarınız</LegalH2>
      <LegalP>
        Yürürlükteki mevzuat (GDPR ve Türkiye&apos;deki KVKK dâhil) çerçevesinde; kişisel verilerinize erişme, bunları düzeltme, silme veya dışa aktarma, belirli işlemelere itiraz etme veya bunları kısıtlama ve işlemenin rızaya dayandığı durumlarda rızanızı geri çekme hakkına sahipsiniz. Bu hakları kullanmak için <LegalEmail /> adresine yazın. Ayrıca yerel veri koruma kurumuna şikâyette bulunma hakkınız da vardır.
      </LegalP>

      <LegalH2>8. Güvenlik</LegalH2>
      <LegalP>
        Verilerinizi korumak için erişim denetimleri ve aktarım sırasında şifreleme dâhil sektör standardı önlemler kullanırız. Sahibine özel içerik (hesabınıza atanan veya yüklediğiniz mankenler gibi) yalnızca sizin erişebileceğiniz şekilde kısıtlanır. Hiçbir iletim veya depolama yöntemi tamamen güvenli değildir ve mutlak güvenliği garanti edemeyiz.
      </LegalP>

      <LegalH2>9. Çerezler</LegalH2>
      <LegalP>
        Yalnızca sizi doğrulamak ve oturumunuzu etkin tutmak için gereken zorunlu çerezleri kullanırız. Reklam çerezleri kullanmıyoruz.
      </LegalP>

      <LegalH2>10. Çocuklar</LegalH2>
      <LegalP>
        Hizmet işletmelere yöneliktir ve 18 yaşından küçük bireyler için tasarlanmamıştır. Çocuklardan bilerek veri toplamıyoruz.
      </LegalP>

      <LegalH2>11. Bu politikadaki değişiklikler</LegalH2>
      <LegalP>
        Bu Gizlilik Politikası&apos;nı zaman zaman güncelleyebiliriz. Güncellenmiş sürümü yeni bir yürürlük tarihiyle yayımlar ve gerektiğinde sizi bilgilendiririz.
      </LegalP>

      <LegalH2>12. İletişim</LegalH2>
      <LegalP>
        {ENTITY}
        <br />
        {ADDRESS}
        <br />
        E-posta: <LegalEmail />
      </LegalP>
    </>
  )
}

export default function PrivacyPage() {
  const { locale } = useI18n()
  const isTr = locale === 'tr'
  const effective = isTr ? '1 Temmuz 2026' : '1 July 2026'

  return (
    <LegalLayout
      title={isTr ? 'Gizlilik Politikası' : 'Privacy Policy'}
      effectiveDate={effective}
      lastUpdated={effective}
      active="privacy"
    >
      {isTr ? <TurkishPrivacy /> : <EnglishPrivacy />}
    </LegalLayout>
  )
}
