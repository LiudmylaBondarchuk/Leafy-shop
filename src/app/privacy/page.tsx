export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Privacy Policy</h1>
      <p className="text-sm text-green-700 dark:text-green-400 font-medium mb-8 tracking-wide uppercase">
        How we handle your data
      </p>

      <div className="prose prose-gray max-w-none space-y-6 text-gray-600 dark:text-gray-400">
        <p className="text-lg leading-relaxed">
          At Leafy, your privacy matters. This policy explains what personal data we collect,
          how we use it, and what rights you have over it.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8">1. What Data We Collect</h2>
        <p>When you place an order or create an account, we may collect:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Name</strong> &mdash; first and last name for order fulfillment</li>
          <li><strong>Email address</strong> &mdash; for order confirmations and status updates</li>
          <li><strong>Phone number</strong> &mdash; for delivery-related communication</li>
          <li><strong>Shipping address</strong> &mdash; street, city, zip code, and country</li>
          <li><strong>Payment information</strong> &mdash; processed securely through third-party providers (we do not store card details)</li>
          <li><strong>Invoice details</strong> &mdash; company name, tax ID (NIP), and billing address if you request an invoice</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8">2. How We Use Your Data</h2>
        <p>We use the information we collect to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Process and fulfill your orders</li>
          <li>Send order confirmations and shipping status updates via email</li>
          <li>Generate invoices when requested</li>
          <li>Respond to customer support inquiries</li>
          <li>Improve our products and services</li>
        </ul>
        <p>We do not sell your personal data to third parties or use it for unsolicited marketing.</p>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8">3. Cookies &amp; Local Storage</h2>
        <p>
          We use <strong>localStorage</strong> in your browser to persist your shopping cart between
          sessions. This data stays entirely on your device and is not transmitted to our servers
          until you place an order. We do not use tracking cookies or third-party analytics.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8">4. Third-Party Services</h2>
        <p>We share your data with the following services only as needed to operate the store:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>PayPal</strong> &mdash; for processing payments. PayPal&apos;s privacy policy applies to payment data handled by them.</li>
          <li><strong>Resend</strong> &mdash; for sending transactional emails (order confirmations, status updates). Only your email address and name are shared.</li>
        </ul>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8">5. Data Retention</h2>
        <p>
          We retain order data for as long as necessary to fulfill legal and accounting obligations
          (typically up to 5 years for tax purposes). You may request deletion of your personal data
          at any time, subject to these legal requirements.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8">6. Your Rights (GDPR)</h2>
        <p>Under the General Data Protection Regulation, you have the right to:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Access</strong> &mdash; request a copy of the personal data we hold about you</li>
          <li><strong>Rectification</strong> &mdash; ask us to correct inaccurate or incomplete data</li>
          <li><strong>Erasure</strong> &mdash; request deletion of your personal data (&quot;right to be forgotten&quot;)</li>
          <li><strong>Restriction</strong> &mdash; ask us to limit how we process your data</li>
          <li><strong>Data portability</strong> &mdash; receive your data in a structured, machine-readable format</li>
          <li><strong>Objection</strong> &mdash; object to the processing of your data for specific purposes</li>
        </ul>
        <p>
          To exercise any of these rights, please contact us at{" "}
          <a href="mailto:support@leafyshop.eu" className="text-green-700 dark:text-green-400 underline">
            support@leafyshop.eu
          </a>.
          We will respond within 30 days.
        </p>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-8">7. Contact</h2>
        <p>
          If you have any questions about this privacy policy or how we handle your data, reach out to us:
        </p>
        <p>
          <strong>Email:</strong>{" "}
          <a href="mailto:support@leafyshop.eu" className="text-green-700 dark:text-green-400 underline">
            support@leafyshop.eu
          </a>
        </p>

        <div className="border-t border-gray-200 dark:border-gray-700 mt-10 pt-6">
          <p className="text-sm text-gray-400 dark:text-gray-500 italic">
            This is a demo project. Leafy is a fictional e-commerce store built for demonstration
            purposes. No real transactions are processed and no real personal data is collected or stored.
          </p>
        </div>
      </div>
    </div>
  );
}
