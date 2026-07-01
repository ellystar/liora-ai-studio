'use client'

import { LegalEmail, LegalH2, LegalLayout, LegalLi, LegalP, LegalUl } from '@/components/legal-layout'
import { useI18n } from '@/lib/i18n/language-provider'

const EFFECTIVE = '[EFFECTIVE DATE]'
const ENTITY = 'Liora Labs'

function EnglishTerms() {
  return (
    <>
      <LegalP>
        These Terms of Use (&quot;Terms&quot;) govern your access to and use of Liora AI Studio (the &quot;Service&quot;), operated by <strong>{ENTITY}</strong> (&quot;Liora&quot;, &quot;we&quot;, &quot;us&quot;). By accessing or using the Service, you agree to these Terms. If you do not agree, do not use the Service.
      </LegalP>

      <LegalH2>1. Eligibility and access</LegalH2>
      <LegalP>
        The Service is invite-only and intended for businesses and professionals aged 18 or over. Access is granted at our discretion and may be limited, suspended, or revoked. You are responsible for keeping your login credentials confidential and for all activity under your account.
      </LegalP>

      <LegalH2>2. Credits and billing</LegalH2>
      <LegalP>
        The Service operates on a credit system. Each successful image generation consumes credits as described in the platform. Credits are purchased in advance through our payment processor. Unless required by applicable law or stated otherwise in writing, purchased credits are non-refundable and non-transferable. We may change pricing and credit costs prospectively, with notice where required.
      </LegalP>

      <LegalH2>3. Your content and rights</LegalH2>
      <LegalP>
        You retain ownership of the images and materials you upload (&quot;Your Content&quot;). You represent and warrant that you own or have all necessary rights, licenses, and permissions to upload Your Content and to have it processed by the Service, and that Your Content does not infringe the rights of any third party.
      </LegalP>
      <LegalP>
        You grant Liora a limited, non-exclusive license to host, process, and transmit Your Content (including to our AI provider) solely to operate the Service and provide results to you. We do not use Your Content to train our own models.
      </LegalP>

      <LegalH2>4. Acceptable use</LegalH2>
      <LegalP>You agree not to use the Service to:</LegalP>
      <LegalUl>
        <LegalLi>upload images of people without their consent, or images you do not have the rights to use;</LegalLi>
        <LegalLi>create, edit, or distribute unlawful, infringing, defamatory, or deceptive content;</LegalLi>
        <LegalLi>generate sexual, exploitative, or otherwise harmful content, or any content involving minors;</LegalLi>
        <LegalLi>impersonate any person or misrepresent generated imagery in a misleading way;</LegalLi>
        <LegalLi>attempt to disrupt, reverse engineer, overload, or gain unauthorized access to the Service.</LegalLi>
      </LegalUl>
      <LegalP>
        We may remove content and suspend accounts that violate these Terms.
      </LegalP>

      <LegalH2>5. AI-generated output</LegalH2>
      <LegalP>
        The Service uses third-party AI models to produce imagery. Results are provided &quot;as is&quot;; we do not guarantee that output will be accurate, suitable for a particular purpose, or free of similarity to other works. You are responsible for reviewing output before commercial use. Subject to your compliance with these Terms, you may use the imagery you generate for your own commercial purposes.
      </LegalP>

      <LegalH2>6. Intellectual property</LegalH2>
      <LegalP>
        The Service, including its software, design, branding, and content (excluding Your Content), is owned by Liora and protected by intellectual property laws. These Terms do not grant you any right in our trademarks or technology beyond the limited right to use the Service.
      </LegalP>

      <LegalH2>7. Service availability</LegalH2>
      <LegalP>
        We aim to keep the Service available but do not guarantee uninterrupted or error-free operation. Generation depends on third-party AI providers and may occasionally be delayed or unavailable. We may modify, suspend, or discontinue features at any time.
      </LegalP>

      <LegalH2>8. Disclaimers and limitation of liability</LegalH2>
      <LegalP>
        To the maximum extent permitted by law, the Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind. To the maximum extent permitted by law, Liora will not be liable for indirect, incidental, or consequential damages, and our total liability for any claim relating to the Service will not exceed the amount you paid to us in the three (3) months preceding the claim.
      </LegalP>

      <LegalH2>9. Termination</LegalH2>
      <LegalP>
        You may stop using the Service at any time. We may suspend or terminate your access if you breach these Terms or if required for security or legal reasons. Provisions that by their nature should survive termination will survive.
      </LegalP>

      <LegalH2>10. Changes to these Terms</LegalH2>
      <LegalP>
        We may update these Terms from time to time. We will post the updated version with a new effective date, and continued use of the Service after changes take effect constitutes acceptance.
      </LegalP>

      <LegalH2>11. Governing law</LegalH2>
      <LegalP>
        These Terms are governed by the laws of [GOVERNING COUNTRY], and the courts of [GOVERNING CITY/COUNTRY] will have jurisdiction over any disputes, without prejudice to any mandatory consumer protections available to you.
      </LegalP>

      <LegalH2>12. Contact</LegalH2>
      <LegalP>
        {ENTITY}
        <br />
        [REGISTERED ADDRESS]
        <br />
        Email: <LegalEmail />
      </LegalP>
    </>
  )
}

function TurkishTerms() {
  return (
    <>
      <LegalP>
        Bu Kullanım Şartları (&quot;Şartlar&quot;), <strong>{ENTITY}</strong> (&quot;Liora&quot;, &quot;biz&quot;) tarafından işletilen Liora AI Studio&apos;ya (&quot;Hizmet&quot;) erişiminizi ve kullanımınızı düzenler. Hizmet&apos;e erişerek veya onu kullanarak bu Şartlar&apos;ı kabul etmiş olursunuz. Kabul etmiyorsanız Hizmet&apos;i kullanmayın.
      </LegalP>

      <LegalH2>1. Uygunluk ve erişim</LegalH2>
      <LegalP>
        Hizmet yalnızca davetle erişilir ve 18 yaş ve üzeri işletmeler ile profesyonellere yöneliktir. Erişim kendi takdirimizle verilir; sınırlandırılabilir, askıya alınabilir veya iptal edilebilir. Giriş bilgilerinizi gizli tutmaktan ve hesabınız altındaki tüm etkinliklerden siz sorumlusunuz.
      </LegalP>

      <LegalH2>2. Krediler ve faturalama</LegalH2>
      <LegalP>
        Hizmet bir kredi sistemiyle çalışır. Her başarılı görsel üretimi, platformda açıklandığı şekilde kredi harcar. Krediler ödeme sağlayıcımız aracılığıyla önceden satın alınır. Yürürlükteki mevzuat gerektirmedikçe veya yazılı olarak aksi belirtilmedikçe, satın alınan krediler iade edilemez ve devredilemez. Fiyatlandırmayı ve kredi maliyetlerini, gerektiğinde bildirimde bulunarak ileriye dönük olarak değiştirebiliriz.
      </LegalP>

      <LegalH2>3. İçeriğiniz ve haklarınız</LegalH2>
      <LegalP>
        Yüklediğiniz görsellerin ve materyallerin (&quot;İçeriğiniz&quot;) mülkiyeti sizde kalır. İçeriğinizi yüklemek ve Hizmet tarafından işlenmesini sağlamak için gerekli tüm haklara, lisanslara ve izinlere sahip olduğunuzu ve İçeriğinizin herhangi bir üçüncü tarafın haklarını ihlal etmediğini beyan ve taahhüt edersiniz.
      </LegalP>
      <LegalP>
        Liora&apos;ya, yalnızca Hizmet&apos;i işletmek ve size sonuç sağlamak amacıyla İçeriğinizi barındırmak, işlemek ve (yapay zekâ sağlayıcımıza da dâhil olmak üzere) iletmek için sınırlı, münhasır olmayan bir lisans verirsiniz. İçeriğinizi kendi modellerimizi eğitmek için kullanmıyoruz.
      </LegalP>

      <LegalH2>4. Kabul edilebilir kullanım</LegalH2>
      <LegalP>Hizmet&apos;i aşağıdaki amaçlarla kullanmamayı kabul edersiniz:</LegalP>
      <LegalUl>
        <LegalLi>kişilerin rızası olmadan görsellerini veya kullanma hakkına sahip olmadığınız görselleri yüklemek;</LegalLi>
        <LegalLi>hukuka aykırı, ihlal edici, karalayıcı veya aldatıcı içerik oluşturmak, düzenlemek veya dağıtmak;</LegalLi>
        <LegalLi>cinsel, istismar edici veya başka şekilde zararlı içerik ya da reşit olmayanları içeren herhangi bir içerik üretmek;</LegalLi>
        <LegalLi>herhangi bir kişinin kimliğine bürünmek veya üretilen görselleri yanıltıcı şekilde sunmak;</LegalLi>
        <LegalLi>Hizmet&apos;i bozmaya, tersine mühendislik yapmaya, aşırı yüklemeye veya yetkisiz erişim sağlamaya çalışmak.</LegalLi>
      </LegalUl>
      <LegalP>
        Bu Şartlar&apos;ı ihlal eden içeriği kaldırabilir ve hesapları askıya alabiliriz.
      </LegalP>

      <LegalH2>5. Yapay zekâ çıktısı</LegalH2>
      <LegalP>
        Hizmet, görsel üretmek için üçüncü taraf yapay zekâ modelleri kullanır. Sonuçlar &quot;olduğu gibi&quot; sunulur; çıktının doğru olacağını, belirli bir amaca uygun olacağını veya başka eserlere benzemeyeceğini garanti etmeyiz. Ticari kullanımdan önce çıktıyı gözden geçirmekten siz sorumlusunuz. Bu Şartlar&apos;a uymanız koşuluyla, ürettiğiniz görselleri kendi ticari amaçlarınız için kullanabilirsiniz.
      </LegalP>

      <LegalH2>6. Fikrî mülkiyet</LegalH2>
      <LegalP>
        Hizmet; yazılımı, tasarımı, markası ve içeriği dâhil (İçeriğiniz hariç) Liora&apos;ya aittir ve fikrî mülkiyet yasalarıyla korunur. Bu Şartlar, Hizmet&apos;i kullanmaya ilişkin sınırlı hak dışında markalarımız veya teknolojimiz üzerinde size herhangi bir hak vermez.
      </LegalP>

      <LegalH2>7. Hizmetin sürekliliği</LegalH2>
      <LegalP>
        Hizmet&apos;i erişilebilir tutmayı amaçlarız ancak kesintisiz veya hatasız çalışacağını garanti etmeyiz. Üretim, üçüncü taraf yapay zekâ sağlayıcılarına bağlıdır ve zaman zaman gecikebilir veya kullanılamayabilir. Özellikleri istediğimiz zaman değiştirebilir, askıya alabilir veya sonlandırabiliriz.
      </LegalP>

      <LegalH2>8. Sorumluluk reddi ve sınırlaması</LegalH2>
      <LegalP>
        Yasaların izin verdiği azami ölçüde, Hizmet herhangi bir garanti olmaksızın &quot;olduğu gibi&quot; ve &quot;mevcut haliyle&quot; sunulur. Yasaların izin verdiği azami ölçüde, Liora dolaylı, arızi veya sonuçsal zararlardan sorumlu olmayacaktır ve Hizmet&apos;e ilişkin herhangi bir talebe yönelik toplam sorumluluğumuz, talebi önceki üç (3) ayda bize ödediğiniz tutarı aşmayacaktır.
      </LegalP>

      <LegalH2>9. Fesih</LegalH2>
      <LegalP>
        Hizmet&apos;i kullanmayı istediğiniz zaman bırakabilirsiniz. Bu Şartlar&apos;ı ihlal etmeniz hâlinde ya da güvenlik veya yasal nedenlerle gerektiğinde erişiminizi askıya alabilir veya sonlandırabiliriz. Niteliği gereği fesihten sonra da geçerli olması gereken hükümler yürürlükte kalır.
      </LegalP>

      <LegalH2>10. Bu Şartlar&apos;daki değişiklikler</LegalH2>
      <LegalP>
        Bu Şartlar&apos;ı zaman zaman güncelleyebiliriz. Güncellenmiş sürümü yeni bir yürürlük tarihiyle yayımlarız ve değişiklikler yürürlüğe girdikten sonra Hizmet&apos;i kullanmaya devam etmeniz kabul anlamına gelir.
      </LegalP>

      <LegalH2>11. Geçerli hukuk</LegalH2>
      <LegalP>
        Bu Şartlar [GOVERNING COUNTRY] yasalarına tabidir ve herhangi bir uyuşmazlıkta, size tanınan zorunlu tüketici korumaları saklı kalmak kaydıyla, [GOVERNING CITY/COUNTRY] mahkemeleri yetkili olacaktır.
      </LegalP>

      <LegalH2>12. İletişim</LegalH2>
      <LegalP>
        {ENTITY}
        <br />
        [REGISTERED ADDRESS]
        <br />
        E-posta: <LegalEmail />
      </LegalP>
    </>
  )
}

export default function TermsPage() {
  const { locale } = useI18n()
  const isTr = locale === 'tr'

  return (
    <LegalLayout
      title={isTr ? 'Kullanım Şartları' : 'Terms of Use'}
      effectiveDate={EFFECTIVE}
      lastUpdated={EFFECTIVE}
      active="terms"
    >
      {isTr ? <TurkishTerms /> : <EnglishTerms />}
    </LegalLayout>
  )
}
