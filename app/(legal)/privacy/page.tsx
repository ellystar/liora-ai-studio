import { LegalEmail, LegalH2, LegalLayout, LegalLi, LegalP, LegalUl } from '@/components/legal-layout'

const EFFECTIVE = '[EFFECTIVE DATE]'

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      effectiveDate={EFFECTIVE}
      lastUpdated={EFFECTIVE}
      active="privacy"
    >
      <LegalP>
        This Privacy Policy explains how <strong>[LEGAL ENTITY NAME]</strong> (&quot;Liora&quot;, &quot;we&quot;, &quot;us&quot;) collects, uses, and protects information when you use Liora AI Studio (the &quot;Service&quot;). By using the Service you agree to the practices described here.
      </LegalP>

      <LegalH2>1. Who we are</LegalH2>
      <LegalP>
        Liora AI Studio is an invite-only platform that helps fashion and beauty brands create professional product imagery using artificial intelligence. The data controller is [LEGAL ENTITY NAME], located at [REGISTERED ADDRESS]. For any privacy question, contact us at <LegalEmail />.
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
        <strong>Billing and credits.</strong> Your credit balance and transaction history. Card or payment details are handled by our payment processor [PAYMENT PROCESSOR] and are not stored by us.
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
        To generate and edit images, the content you upload is transmitted to our AI model provider, <strong>Google (Gemini API)</strong>, for processing. We also rely on the following service providers to operate the platform: <strong>Supabase</strong> (authentication, database, and file storage, hosted in the European Union), <strong>Vercel</strong> (application hosting), and <strong>[PAYMENT PROCESSOR]</strong> (payments). These providers process data on our behalf under their respective terms and security commitments.
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
        [LEGAL ENTITY NAME]
        <br />
        [REGISTERED ADDRESS]
        <br />
        Email: <LegalEmail />
      </LegalP>
    </LegalLayout>
  )
}
