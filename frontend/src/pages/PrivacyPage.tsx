import { Link } from 'react-router-dom';
import LegalLayout, { LegalSection } from '../components/layout/LegalLayout';

const PrivacyPage = () => {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="July 23, 2026">
      <LegalSection heading="1. Information We Collect">
        <p>We collect the following types of information:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li><span className="font-medium text-slate-700 dark:text-slate-300">Account information</span> — name, email address, company, and password (stored as a salted hash).</li>
          <li><span className="font-medium text-slate-700 dark:text-slate-300">Operational data</span> — inventory records, purchase orders, and supplier data you enter into the Service.</li>
          <li><span className="font-medium text-slate-700 dark:text-slate-300">Usage data</span> — pages visited, actions taken, and device/browser information collected automatically.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. How We Use Information">
        <p>We use the information we collect to:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Provide, operate, and maintain the Service, including your dashboards and reports.</li>
          <li>Authenticate your account and keep it secure.</li>
          <li>Respond to support requests and communicate service updates.</li>
          <li>Understand usage patterns so we can improve features and performance.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Data Sharing &amp; Third Parties">
        <p>
          We do not sell your personal information. We may share information with service
          providers who help us operate the Service (for example, hosting or analytics
          providers), under agreements that require them to protect your data, or when required
          to comply with the law.
        </p>
      </LegalSection>

      <LegalSection heading="4. Data Security">
        <p>
          We use industry-standard safeguards, including encryption in transit, to protect your
          information. No method of transmission or storage is 100% secure, so we cannot
          guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection heading="5. Data Retention">
        <p>
          We retain account and operational data for as long as your account is active. You may
          request deletion of your account and associated data at any time, subject to any legal
          retention requirements.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your Rights &amp; Choices">
        <p>
          Depending on your location, you may have the right to access, correct, export, or
          delete your personal information. To exercise these rights, contact us using the
          details below.
        </p>
      </LegalSection>

      <LegalSection heading="7. Cookies">
        <p>
          We use essential cookies and local storage to keep you signed in and to remember
          preferences such as your light/dark theme choice. We do not use third-party
          advertising cookies.
        </p>
      </LegalSection>

      <LegalSection heading="8. Children's Privacy">
        <p>
          The Service is intended for business use and is not directed at individuals under 16.
          We do not knowingly collect personal information from children.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be reflected
          by updating the &quot;Last updated&quot; date above. See also our{' '}
          <Link to="/terms" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            Terms of Service
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection heading="10. Contact Us">
        <p>
          Questions about this Privacy Policy can be sent to{' '}
          <a href="mailto:privacy@supplychainpro.example" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            privacy@supplychainpro.example
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
};

export default PrivacyPage;
