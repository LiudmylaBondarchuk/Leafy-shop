export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Terms & Conditions</h1>
      <p className="text-sm text-gray-400 mb-8">Last updated: March 2026</p>

      <div className="prose prose-gray prose-sm max-w-none space-y-8 text-gray-600">
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">1. General</h2>
          <p>
            These Terms & Conditions govern your use of the Leafy online store (leafyshop.vercel.app)
            and any purchases made through it. By placing an order, you agree to be bound by these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Products & Pricing</h2>
          <p>
            All prices are displayed in US Dollars (USD) and include applicable taxes. Prices are subject
            to change without notice, but changes will not affect orders that have already been confirmed.
          </p>
          <p>
            Product images are for illustration purposes. While we strive for accuracy, slight variations
            in color and appearance may occur due to packaging updates or natural variation in tea and coffee products.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Orders</h2>
          <p>
            An order is confirmed once you receive an order number and confirmation page. We reserve the right
            to cancel orders due to stock unavailability, pricing errors, or suspected fraudulent activity.
          </p>
          <p>
            You may cancel your order before it enters the "Processing" stage. Once processing has begun,
            cancellation is no longer possible.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Shipping</h2>
          <p>We offer the following shipping methods:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Courier (DPD):</strong> $14.99 — estimated delivery 2–4 business days</li>
            <li><strong>InPost Parcel Locker:</strong> $9.99 — estimated delivery 1–3 business days</li>
            <li><strong>In-store Pickup:</strong> Free — available Mon–Fri 10am–6pm</li>
          </ul>
          <p>
            Orders over $100 qualify for free courier shipping. Cash on delivery incurs an additional $5.00 surcharge.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Returns & Refunds</h2>
          <p>
            You may return products within 14 days of delivery for a full refund, provided the items are
            unopened and in their original packaging.
          </p>
          <p>
            To initiate a return, please contact us at hello@leafy-shop.com with your order number.
            Return shipping costs are the responsibility of the customer unless the product is defective.
          </p>
          <p>
            Refunds will be processed within 5–10 business days of receiving the returned items.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Discount Codes</h2>
          <p>
            Discount codes are subject to the conditions specified at the time of issue, including
            minimum order values, expiration dates, and usage limits. Only one discount code may be
            applied per order. Codes cannot be combined or applied retroactively.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Privacy</h2>
          <p>
            We collect only the personal data necessary to process your order (name, email, phone,
            shipping address). We do not share your data with third parties except as required for
            order fulfillment (e.g., shipping carriers). For detailed information, see our Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Contact</h2>
          <p>
            For any questions regarding these terms, please contact us at{" "}
            <a href="mailto:hello@leafy-shop.com" className="text-green-700 hover:text-green-800">
              hello@leafy-shop.com
            </a>.
          </p>
        </section>

        <div className="border-t border-gray-200 pt-6 mt-6">
          <p className="text-xs text-gray-400 italic">
            This is a portfolio project. Leafy is a fictional store created for demonstration purposes.
            No real transactions are processed.
          </p>
        </div>
      </div>
    </div>
  );
}
