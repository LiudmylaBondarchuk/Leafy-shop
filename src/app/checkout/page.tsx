"use client";

import { useCartStore } from "@/store/cart-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatPrice } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Info, User, LogIn } from "lucide-react";
import { SITE_LINKS } from "@/constants/links";
import { COUNTRIES, getCountry } from "@/constants/countries";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

interface CustomerProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  street?: string;
  city?: string;
  zip?: string;
  country?: string;
}

const STEPS = ["Contact & Address", "Shipping", "Payment", "Summary"];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, discountCode, clearCart, subtotal: getSubtotal } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [confirmEmail, setConfirmEmail] = useState("");

  // Customer account state
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [customerLoggedIn, setCustomerLoggedIn] = useState(false);
  const [emailAccountExists, setEmailAccountExists] = useState(false);
  const [showPostOrderSignup, setShowPostOrderSignup] = useState(false);
  const [signupPassword, setSignupPassword] = useState("");
  const [signupSubmitting, setSignupSubmitting] = useState(false);

  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    country: "PL",
    street: "", city: "", zip: "",
    wantsInvoice: false, company: "", nip: "", invoiceAddress: "",
    shippingMethod: "courier" as "courier" | "inpost" | "pickup",
    inpostCode: "",
    paymentMethod: "paypal" as "paypal" | "cod",
    acceptTerms: false,
    notes: "",
  });

  const selectedCountry = getCountry(form.country);

  // Check if customer is logged in and auto-fill
  useEffect(() => {
    const checkCustomer = async () => {
      try {
        const res = await fetch("/api/customer/me");
        if (res.ok) {
          const json = await res.json();
          const data: CustomerProfile = json.data;
          setCustomer(data);
          setCustomerLoggedIn(true);
          setForm((f) => ({
            ...f,
            firstName: data.firstName || f.firstName,
            lastName: data.lastName || f.lastName,
            email: data.email || f.email,
            phone: data.phone || f.phone,
            street: data.street || f.street,
            city: data.city || f.city,
            zip: data.zip || f.zip,
            country: data.country || f.country,
          }));
          setConfirmEmail(data.email || "");
        }
      } catch {
        // not logged in — continue as guest
      }
    };

    checkCustomer();
  }, []);

  // Check if email belongs to an existing account (for guests)
  const checkEmailAccount = useCallback(async (email: string) => {
    if (customerLoggedIn || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    try {
      const res = await fetch("/api/customer/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        setEmailAccountExists(!!json.data?.exists);
      }
    } catch {
      // ignore
    }
  }, [customerLoggedIn]);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && items.length === 0 && !orderPlaced) router.push("/cart");
  }, [mounted, items.length, router, orderPlaced]);

  if (!mounted || (items.length === 0 && !orderPlaced)) return null;

  const updateField = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const updateConfirmEmail = (value: string) => {
    setConfirmEmail(value);
    setErrors((e) => ({ ...e, confirmEmail: "" }));
  };

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};

    if (s === 0) {
      const nameRegex = /^[a-zA-ZàáâãäåæçèéêëìíîïðñòóôõöùúûüýþÿĀ-žА-яЁёІіЇїЄє' -]+$/;
      if (!form.firstName.trim() || form.firstName.trim().length < 2) errs.firstName = "First name must be at least 2 characters";
      else if (!nameRegex.test(form.firstName.trim())) errs.firstName = "First name contains invalid characters";
      if (!form.lastName.trim() || form.lastName.trim().length < 2) errs.lastName = "Last name must be at least 2 characters";
      else if (!nameRegex.test(form.lastName.trim())) errs.lastName = "Last name contains invalid characters";
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email address";
      if (!confirmEmail.trim()) errs.confirmEmail = "Please confirm your email address";
      else if (form.email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) errs.confirmEmail = "Email addresses do not match";

      const phoneClean = form.phone.replace(/\s/g, "");
      if (!phoneClean || phoneClean.length !== selectedCountry.phoneDigits) {
        errs.phone = `Phone must be ${selectedCountry.phoneDigits} digits for ${selectedCountry.name}`;
      } else if (!/^\d+$/.test(phoneClean)) {
        errs.phone = "Phone must contain only digits";
      } else {
        const startsValid = selectedCountry.phoneStartsWith.some((prefix: string) => phoneClean.startsWith(prefix));
        if (!startsValid) {
          errs.phone = "Invalid phone number";
        }
      }

      if (!form.street.trim()) errs.street = "Street is required";
      if (!form.city.trim()) errs.city = "City is required";

      if (!form.zip.trim()) {
        errs.zip = "Zip code is required";
      } else if (!selectedCountry.zipRegex.test(form.zip.trim())) {
        errs.zip = `Invalid format for ${selectedCountry.name} (${selectedCountry.zipFormat})`;
      }

      if (form.wantsInvoice) {
        if (!form.company.trim()) errs.company = "Company name is required";
        if (!form.nip.trim()) {
          errs.nip = `${selectedCountry.vatLabel} is required`;
        } else if (!selectedCountry.validateVat(form.nip.trim())) {
          errs.nip = `Invalid ${selectedCountry.vatLabel} for ${selectedCountry.name}`;
        }
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
  const vatRate = selectedCountry.vatRate;
  const vatAmount = vatRate > 0 ? Math.round(subtotal * vatRate / 100) : 0;
  const total = subtotal + vatAmount + shippingCost; // discount handled server-side

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
            country: form.country,
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
        if (!customerLoggedIn) {
          setShowPostOrderSignup(true);
        } else {
          router.push(`/order/confirmation?number=${json.data.orderNumber}&email=${encodeURIComponent(form.email)}`);
        }
      } else {
        toast.error(json.message || "Failed to place order");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostOrderSignup = async () => {
    if (!signupPassword || signupPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSignupSubmitting(true);
    try {
      const res = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          password: signupPassword,
        }),
      });
      if (res.ok) {
        toast.success("Account created! You can now track your orders.");
      } else {
        const json = await res.json();
        toast.error(json.message || "Could not create account");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSignupSubmitting(false);
      router.push(`/order/confirmation?number=&email=${encodeURIComponent(form.email)}`);
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
          {/* Logged-in customer banner */}
          {customerLoggedIn && customer && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <User className="h-5 w-5 text-green-700 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">
                  Logged in as {customer.firstName} {customer.lastName}
                </p>
                <p className="text-xs text-green-600">Your details have been auto-filled. You can edit them below.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First name *" id="firstName" value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} error={errors.firstName} placeholder="John" />
            <Input label="Last name *" id="lastName" value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} error={errors.lastName} placeholder="Smith" />
          </div>

          <Input label="Email *" id="email" type="email" value={form.email} onChange={(e) => { updateField("email", e.target.value); setEmailAccountExists(false); }} onBlur={(e) => checkEmailAccount(e.target.value)} error={errors.email} placeholder="john@example.com" />

          {/* Existing account banner */}
          {emailAccountExists && !customerLoggedIn && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-blue-800">
                  It looks like you already have an account with this email. Log in to auto-fill your details.
                </p>
                <Link
                  href={`/account/login?redirect=/checkout`}
                  className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Log In
                </Link>
              </div>
            </div>
          )}

          <Input label="Confirm email *" id="confirmEmail" type="email" value={confirmEmail} onChange={(e) => updateConfirmEmail(e.target.value)} error={errors.confirmEmail} placeholder="john@example.com" />

          {/* Country */}
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
            <select
              id="country"
              value={form.country}
              onChange={(e) => {
                updateField("country", e.target.value);
                updateField("zip", "");
                updateField("phone", "");
                updateField("nip", "");
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Phone with prefix */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-sm text-gray-600">
                {selectedCountry.phonePrefix}
              </span>
              <input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  updateField("phone", val);
                }}
                maxLength={selectedCountry.phoneDigits}
                placeholder={"0".repeat(selectedCountry.phoneDigits)}
                className={cn(
                  "flex-1 rounded-r-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1",
                  errors.phone ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-600"
                )}
              />
            </div>
            {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
          </div>

          <Input label="Street & number *" id="street" value={form.street} onChange={(e) => updateField("street", e.target.value)} error={errors.street} placeholder="123 Tea Street, Apt 4" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">Zip code *</label>
              <input
                id="zip"
                value={form.zip}
                onChange={(e) => {
                  let val = e.target.value;
                  if (form.country === "PL") {
                    val = val.replace(/[^\d]/g, "");
                    if (val.length > 2) val = val.slice(0, 2) + "-" + val.slice(2);
                    if (val.length > 6) val = val.slice(0, 6);
                  } else if (form.country === "NL") {
                    val = val.toUpperCase().replace(/[^A-Z0-9\s]/g, "").slice(0, 7);
                  } else if (form.country === "GB") {
                    val = val.toUpperCase().slice(0, 8);
                  } else {
                    val = val.replace(/[^\d-]/g, "").slice(0, 10);
                  }
                  updateField("zip", val);
                }}
                placeholder={selectedCountry.zipPlaceholder}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1",
                  errors.zip ? "border-red-500 focus:ring-red-400" : "border-gray-300 focus:ring-green-600"
                )}
              />
              {errors.zip && <p className="mt-1 text-xs text-red-600">{errors.zip}</p>}
            </div>
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
              <Input label={`${selectedCountry.vatLabel} *`} id="nip" value={form.nip} onChange={(e) => updateField("nip", e.target.value)} error={errors.nip} placeholder={selectedCountry.vatPlaceholder} />
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
          {(["paypal", "cod"] as const).map((method) => {
            const labels = { paypal: "PayPal", cod: "Cash on Delivery (+$5.00)" };
            const descriptions = { paypal: "Pay securely with PayPal, credit or debit card", cod: "Pay when your order arrives" };
            return (
              <label key={method} className={cn("flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors", form.paymentMethod === method ? "border-green-700 bg-green-50" : "border-gray-200 hover:border-gray-300")}>
                <input type="radio" name="payment" value={method} checked={form.paymentMethod === method} onChange={() => updateField("paymentMethod", method)} className="mt-0.5 text-green-700 focus:ring-green-600" />
                <div>
                  <span className="font-medium text-gray-900">{labels[method]}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{descriptions[method]}</p>
                </div>
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
              <div key={item.variantId} className="flex justify-between gap-2 py-2 border-b border-gray-100 last:border-0 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">{item.productName}</span>
                  <span className="text-gray-500 block sm:inline sm:ml-2">{item.variantDesc} x {item.quantity}</span>
                </div>
                <span className="shrink-0">{formatPrice(item.unitPrice * item.quantity)}</span>
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
            <div className="flex justify-between"><span>Payment</span><span>{{ paypal: "PayPal", cod: "Cash on Delivery" }[form.paymentMethod]}</span></div>
          </div>

          {/* Totals */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            {vatRate > 0 && <div className="flex justify-between"><span>VAT ({vatRate}%)</span><span>{formatPrice(vatAmount)}</span></div>}
            <div className="flex justify-between"><span>Shipping</span><span>{shippingCost === 0 ? "Free" : formatPrice(shippingCost)}</span></div>
            {discountCode && <div className="flex justify-between text-green-700"><span>Discount ({discountCode})</span><span>Applied at checkout</span></div>}
            <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
              <span>Total</span><span className="text-green-800">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={form.acceptTerms} onChange={(e) => updateField("acceptTerms", e.target.checked)} className="mt-0.5 rounded border-gray-300 text-green-700 focus:ring-green-600" />
            <span className="text-sm text-gray-600">I accept the <a href={SITE_LINKS.terms.href} target="_blank" className="text-green-700 underline hover:text-green-800">{SITE_LINKS.terms.label}</a> and <a href={SITE_LINKS.privacy.href} target="_blank" className="text-green-700 underline hover:text-green-800">{SITE_LINKS.privacy.label}</a> *</span>
          </label>

          {form.notes !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order notes (optional)</label>
              <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="Any special requests..." />
            </div>
          )}

          <div className="pt-2">
            <div className="flex justify-between mb-4">
              <Button variant="ghost" onClick={goBack}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
              {form.paymentMethod !== "paypal" && (
                <Button size="lg" onClick={handleSubmit} loading={submitting} disabled={!form.acceptTerms || submitting}>
                  Place Order
                </Button>
              )}
            </div>

            {form.paymentMethod === "paypal" && form.acceptTerms && (
              <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!, currency: "USD", locale: "en_US", disableFunding: "paylater,venmo,card,p24,blik,sofort,giropay,sepa,ideal,bancontact,eps,mybank" }}>
                <PayPalButtons
                  style={{ layout: "vertical", shape: "rect", label: "pay", tagline: false }}
                  fundingSource="paypal"
                  disabled={submitting}
                  createOrder={async () => {
                    setSubmitting(true);
                    try {
                      // Calculate total for PayPal (don't create order yet)
                      const calcRes = await fetch("/api/cart/calculate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
                          discount_code: discountCode || undefined,
                          shipping_method: form.shippingMethod,
                        }),
                      });
                      const calcJson = await calcRes.json();
                      const totalForPaypal = calcJson.data?.total || total;

                      // Create PayPal order only (no shop order yet)
                      const ppRes = await fetch("/api/paypal/create-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ totalInCents: totalForPaypal, orderNumber: "PENDING" }),
                      });
                      const ppJson = await ppRes.json();

                      if (ppJson.data?.paypalOrderId) {
                        return ppJson.data.paypalOrderId;
                      } else {
                        toast.error("Failed to initialize PayPal");
                        setSubmitting(false);
                        return "";
                      }
                    } catch {
                      toast.error("Something went wrong");
                      setSubmitting(false);
                      return "";
                    }
                  }}
                  onApprove={async (data) => {
                    try {
                      // Step 1: Create order in our system
                      const orderRes = await fetch("/api/orders", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
                          discount_code: discountCode || undefined,
                          customer: { email: form.email.trim(), phone: form.phone.replace(/\s/g, ""), first_name: form.firstName.trim(), last_name: form.lastName.trim() },
                          shipping: { street: form.street.trim(), city: form.city.trim(), zip: form.zip.trim(), country: form.country, method: form.shippingMethod, inpost_code: form.inpostCode || undefined },
                          payment: { method: "paypal" },
                          invoice: { wants_invoice: form.wantsInvoice, company: form.company || undefined, nip: form.nip || undefined, address: form.invoiceAddress || undefined },
                          notes: form.notes || undefined,
                        }),
                      });
                      const orderJson = await orderRes.json();

                      if (!orderJson.data?.orderNumber) {
                        toast.error(orderJson.message || "Failed to create order");
                        setSubmitting(false);
                        return;
                      }

                      // Step 2: Capture PayPal payment
                      const captureRes = await fetch("/api/paypal/capture-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ paypalOrderId: data.orderID, orderNumber: orderJson.data.orderNumber }),
                      });
                      const captureJson = await captureRes.json();

                      if (captureJson.data?.status === "COMPLETED") {
                        setOrderPlaced(true);
                        clearCart();
                        router.push(`/order/confirmation?number=${orderJson.data.orderNumber}&email=${encodeURIComponent(form.email.trim())}`);
                      } else {
                        toast.error("Payment was not completed");
                      }
                    } catch {
                      toast.error("Failed to process payment");
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  onCancel={() => {
                    toast.info("Payment cancelled — no order was created");
                    setSubmitting(false);
                  }}
                  onError={(err) => {
                    console.error("PayPal error:", err);
                    toast.error("PayPal encountered an error");
                    setSubmitting(false);
                  }}
                />
              </PayPalScriptProvider>
            )}

            {form.paymentMethod === "paypal" && !form.acceptTerms && (
              <p className="text-sm text-gray-500 text-center py-4">
                Please accept the Terms & Conditions to proceed with PayPal payment.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Post-order signup prompt for guests */}
      {showPostOrderSignup && !customerLoggedIn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Create an account to track your orders
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Just set a password and you&apos;re all set. We already have your name and email.
            </p>
            <div className="space-y-4">
              <Input
                label="Password"
                id="signupPassword"
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    setShowPostOrderSignup(false);
                    router.push(`/order/confirmation?number=&email=${encodeURIComponent(form.email)}`);
                  }}
                >
                  Skip
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePostOrderSignup}
                  loading={signupSubmitting}
                  disabled={signupSubmitting}
                >
                  Create Account
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
