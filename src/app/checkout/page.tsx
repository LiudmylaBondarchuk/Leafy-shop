"use client";

import { useCartStore } from "@/store/cart-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatPrice } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Contact & Address", "Shipping", "Payment", "Summary"];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, discountCode, clearCart, subtotal: getSubtotal } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    street: "", city: "", zip: "",
    wantsInvoice: false, company: "", nip: "", invoiceAddress: "",
    shippingMethod: "courier" as "courier" | "inpost" | "pickup",
    inpostCode: "",
    paymentMethod: "blik" as "blik" | "card" | "transfer" | "cod",
    acceptTerms: false,
    notes: "",
  });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && items.length === 0 && !orderPlaced) router.push("/cart");
  }, [mounted, items.length, router, orderPlaced]);

  if (!mounted || (items.length === 0 && !orderPlaced)) return null;

  const updateField = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};

    if (s === 0) {
      if (!form.firstName.trim() || form.firstName.trim().length < 2) errs.firstName = "First name must be at least 2 characters";
      if (!form.lastName.trim() || form.lastName.trim().length < 2) errs.lastName = "Last name must be at least 2 characters";
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email address";
      if (!form.phone.trim() || !/^\d{9}$/.test(form.phone.replace(/\s/g, ""))) errs.phone = "Phone must be 9 digits";
      if (!form.street.trim()) errs.street = "Street is required";
      if (!form.city.trim()) errs.city = "City is required";
      if (!form.zip.trim() || !/^\d{2}-\d{3}$/.test(form.zip)) errs.zip = "Zip must be XX-XXX format";
      if (form.wantsInvoice) {
        if (!form.company.trim()) errs.company = "Company name is required";
        if (!form.nip.trim() || !/^\d{10}$/.test(form.nip)) errs.nip = "NIP must be 10 digits";
        if (!form.invoiceAddress.trim()) errs.invoiceAddress = "Company address is required";
      }
    }

    if (s === 1 && form.shippingMethod === "inpost" && !form.inpostCode.trim()) {
      errs.inpostCode = "Parcel locker code is required";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) setStep(step + 1);
  };
  const goBack = () => setStep(step - 1);

  const subtotal = getSubtotal();
  const shippingCosts = { courier: 1499, inpost: 999, pickup: 0 };
  let shippingCost = shippingCosts[form.shippingMethod];
  if (subtotal >= 10000) shippingCost = 0;
  if (form.paymentMethod === "cod") shippingCost += 500;
  const total = subtotal + shippingCost; // discount handled server-side

  const handleSubmit = async () => {
    if (!form.acceptTerms) { toast.error("Please accept the terms and conditions"); return; }
    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
          discount_code: discountCode || undefined,
          customer: {
            email: form.email.trim(), phone: form.phone.replace(/\s/g, ""),
            first_name: form.firstName.trim(), last_name: form.lastName.trim(),
          },
          shipping: {
            street: form.street.trim(), city: form.city.trim(), zip: form.zip.trim(),
            method: form.shippingMethod, inpost_code: form.inpostCode || undefined,
          },
          payment: { method: form.paymentMethod },
          invoice: {
            wants_invoice: form.wantsInvoice, company: form.company || undefined,
            nip: form.nip || undefined, address: form.invoiceAddress || undefined,
          },
          notes: form.notes || undefined,
        }),
      });

      const json = await res.json();
      if (json.data?.orderNumber) {
        setOrderPlaced(true);
        clearCart();
        router.push(`/order/confirmation?number=${json.data.orderNumber}&email=${encodeURIComponent(form.email)}`);
      } else {
        toast.error(json.message || "Failed to place order");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

      {/* Stepper */}
      <div className="flex items-center mb-10">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
                i < step ? "bg-green-700 border-green-700 text-white" :
                i === step ? "border-green-700 text-green-700" :
                "border-gray-300 text-gray-400"
              )}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-sm hidden sm:block", i <= step ? "text-gray-900 font-medium" : "text-gray-400")}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className={cn("flex-1 h-0.5 mx-3", i < step ? "bg-green-700" : "bg-gray-200")} />}
          </div>
        ))}
      </div>

      {/* Step 0: Contact & Address */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First name *" id="firstName" value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} error={errors.firstName} placeholder="John" />
            <Input label="Last name *" id="lastName" value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} error={errors.lastName} placeholder="Smith" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email *" id="email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} error={errors.email} placeholder="john@example.com" />
            <Input label="Phone *" id="phone" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} error={errors.phone} placeholder="500600700" />
          </div>
          <Input label="Street & number *" id="street" value={form.street} onChange={(e) => updateField("street", e.target.value)} error={errors.street} placeholder="123 Tea Street, Apt 4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Zip code *" id="zip" value={form.zip} onChange={(e) => updateField("zip", e.target.value)} error={errors.zip} placeholder="00-001" />
            <Input label="City *" id="city" value={form.city} onChange={(e) => updateField("city", e.target.value)} error={errors.city} placeholder="Warsaw" />
          </div>

          {/* Invoice */}
          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input type="checkbox" checked={form.wantsInvoice} onChange={(e) => updateField("wantsInvoice", e.target.checked)} className="rounded border-gray-300 text-green-700 focus:ring-green-600" />
            <span className="text-sm text-gray-700">I need a VAT invoice</span>
          </label>
          {form.wantsInvoice && (
            <div className="space-y-4 pl-6 border-l-2 border-green-200">
              <Input label="Company name *" id="company" value={form.company} onChange={(e) => updateField("company", e.target.value)} error={errors.company} placeholder="Acme Ltd." />
              <Input label="Tax ID (NIP) *" id="nip" value={form.nip} onChange={(e) => updateField("nip", e.target.value)} error={errors.nip} placeholder="1234567890" />
              <Input label="Company address *" id="invoiceAddress" value={form.invoiceAddress} onChange={(e) => updateField("invoiceAddress", e.target.value)} error={errors.invoiceAddress} placeholder="456 Business Ave, 00-002 Warsaw" />
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={() => router.push("/cart")}><ChevronLeft className="mr-1 h-4 w-4" /> Back to cart</Button>
            <Button onClick={goNext}>Next <ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Step 1: Shipping */}
      {step === 1 && (
        <div className="space-y-4">
          {(["courier", "inpost", "pickup"] as const).map((method) => {
            const labels = { courier: "Courier (DPD)", inpost: "InPost Parcel Locker", pickup: "In-store Pickup" };
            const costs = { courier: subtotal >= 10000 ? "Free" : "$14.99", inpost: "$9.99", pickup: "Free" };
            return (
              <label key={method} className={cn("flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors", form.shippingMethod === method ? "border-green-700 bg-green-50" : "border-gray-200 hover:border-gray-300")}>
                <input type="radio" name="shipping" value={method} checked={form.shippingMethod === method} onChange={() => updateField("shippingMethod", method)} className="mt-0.5 text-green-700 focus:ring-green-600" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">{labels[method]}</span>
                    <span className="text-sm font-medium text-gray-600">{costs[method]}</span>
                  </div>
                  {method === "pickup" && form.shippingMethod === "pickup" && (
                    <p className="text-sm text-gray-500 mt-1">5 Leafy Lane, Warsaw — Mon–Fri 10am–6pm</p>
                  )}
                </div>
              </label>
            );
          })}
          {form.shippingMethod === "inpost" && (
            <Input label="Parcel locker code *" id="inpostCode" value={form.inpostCode} onChange={(e) => updateField("inpostCode", e.target.value)} error={errors.inpostCode} placeholder="WAR01A" />
          )}
          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={goBack}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
            <Button onClick={goNext}>Next <ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Step 2: Payment */}
      {step === 2 && (
        <div className="space-y-4">
          {(["blik", "card", "transfer", "cod"] as const).map((method) => {
            const labels = { blik: "BLIK", card: "Credit / Debit Card", transfer: "Bank Transfer", cod: "Cash on Delivery (+$5.00)" };
            return (
              <label key={method} className={cn("flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors", form.paymentMethod === method ? "border-green-700 bg-green-50" : "border-gray-200 hover:border-gray-300")}>
                <input type="radio" name="payment" value={method} checked={form.paymentMethod === method} onChange={() => updateField("paymentMethod", method)} className="text-green-700 focus:ring-green-600" />
                <span className="font-medium text-gray-900">{labels[method]}</span>
              </label>
            );
          })}
          <div className="flex justify-between pt-4">
            <Button variant="ghost" onClick={goBack}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
            <Button onClick={goNext}>Next <ChevronRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Step 3: Summary */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Products */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold mb-3">Products</h3>
            {items.map((item) => (
              <div key={item.variantId} className="flex justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                <div>
                  <span className="font-medium">{item.productName}</span>
                  <span className="text-gray-500 ml-2">{item.variantDesc} × {item.quantity}</span>
                </div>
                <span>{formatPrice(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm space-y-2">
            <h3 className="font-semibold mb-2">Delivery Details</h3>
            <p>{form.firstName} {form.lastName}</p>
            <p>{form.street}, {form.zip} {form.city}</p>
            <p>{form.email} · {form.phone}</p>
            {form.wantsInvoice && (
              <div className="pt-2 border-t border-gray-100 mt-2">
                <p className="font-medium">Invoice: {form.company}</p>
                <p>NIP: {form.nip}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span>Shipping</span><span>{{ courier: "Courier (DPD)", inpost: "InPost", pickup: "In-store Pickup" }[form.shippingMethod]}</span></div>
            <div className="flex justify-between"><span>Payment</span><span>{{ blik: "BLIK", card: "Card", transfer: "Bank Transfer", cod: "Cash on Delivery" }[form.paymentMethod]}</span></div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{shippingCost === 0 ? "Free" : formatPrice(shippingCost)}</span></div>
            {discountCode && <div className="flex justify-between text-green-700"><span>Discount ({discountCode})</span><span>Applied at checkout</span></div>}
            <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
              <span>Total</span><span className="text-green-800">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={form.acceptTerms} onChange={(e) => updateField("acceptTerms", e.target.checked)} className="mt-0.5 rounded border-gray-300 text-green-700 focus:ring-green-600" />
            <span className="text-sm text-gray-600">I accept the <span className="text-green-700 underline">Terms & Conditions</span> and <span className="text-green-700 underline">Privacy Policy</span> *</span>
          </label>

          {form.notes !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order notes (optional)</label>
              <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="Any special requests..." />
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={goBack}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
            <Button size="lg" onClick={handleSubmit} loading={submitting} disabled={!form.acceptTerms}>
              Place Order
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
