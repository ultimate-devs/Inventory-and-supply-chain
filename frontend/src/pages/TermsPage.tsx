import { Link } from 'react-router-dom';
import LegalLayout, { LegalSection } from '../components/layout/LegalLayout';

const TermsPage = () => {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="July 23, 2026">
      <LegalSection heading="1. Acceptance of Terms">
        <p>
          By creating an account or otherwise using SupplyChain Pro (&quot;the Service&quot;), you
          agree to be bound by these Terms of Service. If you are using the Service on behalf of
          an organization, you are agreeing on behalf of that organization and confirm that you
          have the authority to do so.
        </p>
      </LegalSection>

      <LegalSection heading="2. Description of Service">
        <p>
          SupplyChain Pro provides tools for inventory tracking, procurement and purchase-order
          management, supplier scoring, and related analytics. The Service is provided
          &quot;as is&quot; and features may change, be added, or be removed over time.
        </p>
      </LegalSection>

      <LegalSection heading="3. Accounts &amp; Registration">
        <p>
          You must provide accurate and complete information when creating an account and keep
          your credentials confidential. You are responsible for all activity that occurs under
          your account. Notify us immediately if you suspect unauthorized access.
        </p>
      </LegalSection>

      <LegalSection heading="4. Acceptable Use">
        <p>You agree not to:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Use the Service for any unlawful purpose or in violation of any applicable regulation.</li>
          <li>Attempt to gain unauthorized access to any part of the Service or its underlying systems.</li>
          <li>Upload malicious code, or interfere with the normal operation of the Service.</li>
          <li>Reverse engineer, resell, or sublicense the Service without prior written consent.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="5. Your Data &amp; Content">
        <p>
          You retain ownership of the inventory, procurement, and supplier data you upload to the
          Service (&quot;Your Data&quot;). You grant us a limited license to host, process, and
          display Your Data solely to operate and improve the Service. See our{' '}
          <Link to="/privacy" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            Privacy Policy
          </Link>{' '}
          for details on how data is handled.
        </p>
      </LegalSection>

      <LegalSection heading="6. Termination">
        <p>
          You may stop using the Service and delete your account at any time. We may suspend or
          terminate access if these Terms are violated, or if required to protect the Service or
          other users.
        </p>
      </LegalSection>

      <LegalSection heading="7. Disclaimer of Warranties">
        <p>
          The Service is provided on an &quot;as is&quot; and &quot;as available&quot; basis
          without warranties of any kind, whether express or implied, including but not limited
          to fitness for a particular purpose, accuracy, or uninterrupted availability.
        </p>
      </LegalSection>

      <LegalSection heading="8. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, SupplyChain Pro shall not be liable for any
          indirect, incidental, special, or consequential damages arising out of or related to
          your use of the Service.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes to These Terms">
        <p>
          We may update these Terms from time to time. Material changes will be reflected by
          updating the &quot;Last updated&quot; date above. Continued use of the Service after
          changes take effect constitutes acceptance of the revised Terms.
        </p>
      </LegalSection>

      <LegalSection heading="10. Contact Us">
        <p>
          Questions about these Terms can be sent to{' '}
          <a href="mailto:support@supplychainpro.example" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
            support@supplychainpro.example
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
};

export default TermsPage;
