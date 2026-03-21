import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Contact Us</h1>

      <p className="text-gray-600 mb-8">
        Have a question about our products, your order, or just want to say hello?
        We'd love to hear from you.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex gap-4">
          <div className="bg-green-100 p-3 rounded-lg h-fit">
            <Mail className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
            <a href="mailto:hello@leafy-shop.com" className="text-green-700 hover:text-green-800 text-sm">
              hello@leafy-shop.com
            </a>
            <p className="text-xs text-gray-400 mt-1">We reply within 24 hours</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 flex gap-4">
          <div className="bg-green-100 p-3 rounded-lg h-fit">
            <Phone className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
            <a href="tel:+15551234567" className="text-green-700 hover:text-green-800 text-sm">
              +1 (555) 123-4567
            </a>
            <p className="text-xs text-gray-400 mt-1">Mon–Fri, 9am–6pm CET</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 flex gap-4">
          <div className="bg-green-100 p-3 rounded-lg h-fit">
            <MapPin className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
            <p className="text-sm text-gray-600">
              5 Leafy Lane<br />
              Warsaw, Poland
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 flex gap-4">
          <div className="bg-green-100 p-3 rounded-lg h-fit">
            <Clock className="h-5 w-5 text-green-700" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Business Hours</h3>
            <p className="text-sm text-gray-600">
              Mon–Fri: 9:00 AM – 6:00 PM CET<br />
              Sat–Sun: Closed
            </p>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-100 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Order Issues?</h2>
        <p className="text-sm text-gray-600">
          If you have questions about an existing order, please include your order number
          (e.g., LEA-20260321-0001) in your email so we can help you faster. You can also
          {" "}<a href="/order/status" className="text-green-700 hover:text-green-800 underline">track your order here</a>.
        </p>
      </div>
    </div>
  );
}
