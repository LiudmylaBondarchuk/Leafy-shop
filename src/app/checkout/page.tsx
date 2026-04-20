"use client";

import { useCartStore } from "@/store/cart-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatPrice } from "@/lib/utils";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Info, User, LogIn } from "lucide-react";
import { SITE_LINKS } from "@/constants/links";
import { COUNTRIES, getCountry } from "@/constants/countries";
import { FREE_SHIPPING_THRESHOLD, COD_SURCHARGE, SHIPPING_METHODS } from "@/constants/shipping-methods";
import { STORE_PICKUP_ADDRESS, STORE_PICKUP_HOURS } from "@/constants/store";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { validateCheckoutStep, type CheckoutFormInput } from "@/lib/validators/checkout-client";

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


  // Customer account state
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [customerLoggedIn, setCustomerLoggedIn] = useState(false);
  const [emailAccountExists, setEmailAccountExists] = useState(false);
  const [showPostOrderSignup, setShowPostOrderSignup] = useState(false);
  const [placedOrderNumber, setPlacedOrderNumber] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupSubmitting, setSignupSubmitting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [calculatedDiscount, setCalculatedDiscount] = useState(0);
  const [effectiveShippingCost, setEffectiveShippingCost] = useState<number | null>(null);

  const [form, setForm] = useState<CheckoutFormInput>({
    firstName: "", lastName: "", email: "", phone: "",
    country: "PL",
    street: "", city: "", zip: "",
    wantsInvoice: false, company: "", nip: "", invoiceAddress: "",
    shippingMethod: "courier",
    inpostCode: "",
    paymentMethod: "paypal",
    acceptTerms: false,
    notes: "",
  });

  const selectedCountry = getCountry(form.country);

  // Tracks the pending_payment order created when the user starts PayPal checkout.
  // Held in a ref so PayPal callbacks (which close over stale state) always see the latest value.
  const [pendingOrder, setPendingOrder] = useState<{ orderNumber: string; cancelToken: string } | null>(null);
  const pendingOrderRef = useRef<{ orderNumber: string; cancelToken: string } | null>(null);
  useEffect(() => { pendingOrderRef.current = pendingOrder; }, [pendingOrder]);

  const releasePendingOrder = useCallback(async (orderNumber: string, email: string, cancelToken: string) => {
    try {
      await fetch("/api/orders/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email: email.trim(), cancelToken }),
      });
    } catch (err) {
      console.error("Failed to release pending order:", err);
    }
  }, []);

  // Best-effort release on tab close while a PayPal session is pending
  useEffect(() => {
    const handler = () => {
      const p = pendingOrderRef.current;
      if (!p) return;
      const payload = JSON.stringify({ orderNumber: p.orderNumber, email: form.email.trim(), cancelToken: p.cancelToken });
      navigator.sendBeacon?.("/api/orders/cancel", new Blob([payload], { type: "application/json" }));
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [form.email]);

  // Check if customer is logged in and auto-fill
  useEffect(() => {
    const checkCustomer = async () => {
      try {
        const res = await fetch("/api/customer/me");
        if (res.ok) {
          const json = await res.json();
          const data = json.data?.customer;
          if (data) {
            setCustomer(data);
            setCustomerLoggedIn(true);
            setForm((f) => ({
              ...f,
              firstName: data.firstName || f.firstName,
              lastName: data.lastName || f.lastName,
              email: data.email || f.email,
              phone: data.phone || f.phone,
              street: data.shippingStreet || f.street,
              city: data.shippingCity || f.city,
              zip: data.shippingZip || f.zip,
              country: (data.shippingCountry && data.shippingCountry.length === 2) ? data.shippingCountry : f.country,
            }));
            setConfirmEmail(data.email || "");
          }
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
    if (mounted && items.length === 0 && !orderPlaced) router.replace("/cart");
  }, [mounted, items.length, router, orderPlaced]);

  // Fetch server-calculated discount amount when discount code is present
  useEffect(() => {
    if (!mounted || !discountCode || items.length === 0) {
      setCalculatedDiscount(0);
      setEffectiveShippingCost(null);
      return;
    }

    const controller = new AbortController();

    const fetchDiscount = async () => {
      try {
        const res = await fetch("/api/cart/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
            discount_code: discountCode,
            shipping_method: form.shippingMethod,
          }),
          signal: controller.signal,
        });
        const json = await res.json();
        if (json.data?.discount?.amount) {
          setCalculatedDiscount(json.data.discount.amount);
        } else {
          setCalculatedDiscount(0);
        }
        // Apply server-side shipping cost (handles free_shipping discount type)
        if (json.data?.shipping !== undefined) {
          setEffectiveShippingCost(json.data.shipping);
        } else if (json.data?.shippingCost !== undefined) {
          setEffectiveShippingCost(json.data.shippingCost);
        } else {
          setEffectiveShippingCost(null);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setCalculatedDiscount(0);
        setEffectiveShippingCost(null);
      }
    };

    fetchDiscount();

    return () => controller.abort();
  }, [mounted, discountCode, items, form.shippingMethod]);

  if (!mounted) return null;

  if (items.length === 0 && !orderPlaced) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-3">Your cart is empty</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Add products before heading to checkout. Redirecting you to the cart…
        </p>
        <Link href="/cart" className="inline-flex items-center justify-center rounded-lg bg-green-700 text-white px-5 py-2.5 text-sm font-medium hover:bg-green-800 transition">
          Go to cart
        </Link>
      </div>
    );
  }

  const updateField = <K extends keyof CheckoutFormInput>(field: K, value: CheckoutFormInput[K]) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validateStep = (s: number): boolean => {
    const errs = validateCheckoutStep(s, form);
    setErrors(errs as Record<string, string>);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) setStep(step + 1);
  };
  const goBack = () => setStep(step - 1);

  const subtotal = getSubtotal();
  let shippingCost = SHIPPING_METHODS[form.shippingMethod]?.cost ?? SHIPPING_METHODS.courier.cost;
  if (subtotal >= FREE_SHIPPING_THRESHOLD) shippingCost = 0;
  if (form.paymentMethod === "cod") shippingCost += COD_SURCHARGE;
  // Use server-provided shipping cost when a discount code is active (handles free_shipping discounts)
  const finalShippingCost = discountCode && effectiveShippingCost !== null ? effectiveShippingCost : shippingCost;
  // All prices are gross (include 23% Polish VAT). Always show 23% VAT in cart since customer pays gross.
  // The invoice will show the correct VAT breakdown based on country/VAT ID.
  const vatRate = 23;
  const discountedSubtotal = subtotal - calculatedDiscount;
  const vatAmount = Math.round(discountedSubtotal - discountedSubtotal / (1 + vatRate / 100));
  const total = Math.max(0, discountedSubtotal + finalShippingCost); // VAT already in prices

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
        setPlacedOrderNumber(json.data.orderNumber);
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
      setShowPostOrderSignup(false);
      router.push(`/order/confirmation?number=${placedOrderNumber}&email=${encodeURIComponent(form.email)}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8">Checkout</h1>

      {/* Stepper */}
      <div className="flex items-center mb-10">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
                i < step ? "bg-green-700 border-green-700 text-white" :
                i === step ? "border-green-700 text-green-700 dark:text-green-400 dark:border-green-500" :
                "border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"
              )}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-sm hidden sm:block", i <= step ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-400 dark:text-gray-500")}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className={cn("flex-1 h-0.5 mx-3", i < step ? "bg-green-700" : "bg-gray-200 dark:bg-gray-700")} />}
          </div>
        ))}
      </div>

      {/* Step 0: Contact & Address */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Logged-in customer banner */}
          {customerLoggedIn && customer && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
              <User className="h-5 w-5 text-green-700 dark:text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Logged in as {customer.firstName} {customer.lastName}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">Your details have been auto-filled. You can edit them below.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="First name *" id="firstName" value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} error={errors.firstName} placeholder="John" maxLength={100} />
            <Input label="Last name *" id="lastName" value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} error={errors.lastName} placeholder="Smith" maxLength={100} />
          </div>

          <Input label="Email *" id="email" type="email" value={form.email} onChange={(e) => { updateField("email", e.target.value); setEmailAccountExists(false); }} onBlur={(e) => checkEmailAccount(e.target.value)} error={errors.email} placeholder="john@example.com" maxLength={255} />

          {/* Existing account banner */}
          {emailAccountExists && !customerLoggedIn && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-blue-800 dark:text-blue-300">
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


          {/* Country */}
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country *</label>
            <select
              id="country"
              value={form.country}
              onChange={(e) => {
                updateField("country", e.target.value);
                updateField("zip", "");
                updateField("phone", "");
                updateField("nip", "");
              }}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Phone with prefix */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone *</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-300">
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

          <Input label="Street & number *" id="street" value={form.street} onChange={(e) => updateField("street", e.target.value)} error={errors.street} placeholder="123 Tea Street, Apt 4" maxLength={200} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="zip" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zip code *</label>
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
            <Input label="City *" id="city" value={form.city} onChange={(e) => updateField("city", e.target.value)} error={errors.city} placeholder="Warsaw" maxLength={100} />
          </div>

          {/* Invoice */}
          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input type="checkbox" checked={form.wantsInvoice} onChange={(e) => updateField("wantsInvoice", e.target.checked)} className="rounded border-gray-300 text-green-700 focus:ring-green-600" />
            <span className="text-sm text-gray-700">I need a VAT invoice</span>
          </label>
          {form.wantsInvoice && (
            <div className="space-y-4 pl-6 border-l-2 border-green-200">
              <Input label="Company name *" id="company" value={form.company} onChange={(e) => updateField("company", e.target.value)} error={errors.company} placeholder="Acme Ltd." maxLength={200} />
              <div>
                <Input label={`${selectedCountry.vatLabel} *`} id="nip" value={form.nip} onChange={(e) => updateField("nip", e.target.value)} error={errors.nip} placeholder={selectedCountry.vatPlaceholder} />
                {selectedCountry.eu && selectedCountry.code !== "PL" && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Enter your EU VAT ID in format {selectedCountry.code}123456789 for reverse charge (0% VAT). Without a valid VAT ID, 23% Polish VAT will apply.
                  </p>
                )}
              </div>
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
            const labels = { courier: SHIPPING_METHODS.courier.label, inpost: SHIPPING_METHODS.inpost.label, pickup: SHIPPING_METHODS.pickup.label };
            const methodCost = SHIPPING_METHODS[method]?.cost ?? 0;
            const costs = { courier: subtotal >= FREE_SHIPPING_THRESHOLD ? "Free" : formatPrice(SHIPPING_METHODS.courier.cost), inpost: formatPrice(SHIPPING_METHODS.inpost.cost), pickup: "Free" };
            return (
              <label key={method} className={cn("flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors", form.shippingMethod === method ? "border-green-700 bg-green-50 dark:bg-green-900/20 dark:border-green-600" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600")}>
                <input type="radio" name="shipping" value={method} checked={form.shippingMethod === method} onChange={() => updateField("shippingMethod", method)} className="mt-0.5 text-green-700 focus:ring-green-600" />
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{labels[method]}</span>
                    <span className="text-sm font-medium text-gray-600">{costs[method]}</span>
                  </div>
                  {method === "pickup" && form.shippingMethod === "pickup" && (
                    <p className="text-sm text-gray-500 mt-1">{STORE_PICKUP_ADDRESS} — {STORE_PICKUP_HOURS}</p>
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
            const labels = { paypal: "PayPal", cod: "Cash on Delivery (+€5.00)" };
            const descriptions = { paypal: "Pay securely with PayPal, credit or debit card", cod: "Pay when your order arrives" };
            return (
              <label key={method} className={cn("flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors", form.paymentMethod === method ? "border-green-700 bg-green-50 dark:bg-green-900/20 dark:border-green-600" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600")}>
                <input type="radio" name="payment" value={method} checked={form.paymentMethod === method} onChange={() => updateField("paymentMethod", method)} className="mt-0.5 text-green-700 focus:ring-green-600" />
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{labels[method]}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{descriptions[method]}</p>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm space-y-2">
            <h3 className="font-semibold mb-2">Delivery Details</h3>
            <p>{form.firstName} {form.lastName}</p>
            <p>{form.street}, {form.zip} {form.city}</p>
            <p>{form.email} · {form.phone}</p>
            {form.wantsInvoice && (
              <div className="pt-2 border-t border-gray-100 mt-2">
                <p className="font-medium">Invoice: {form.company}</p>
                <p>{selectedCountry.vatLabel}: {form.nip}</p>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span>Shipping</span><span>{{ courier: "Courier (DPD)", inpost: "InPost", pickup: "In-store Pickup" }[form.shippingMethod]}</span></div>
            <div className="flex justify-between"><span>Payment</span><span>{{ paypal: "PayPal", cod: "Cash on Delivery" }[form.paymentMethod]}</span></div>
          </div>

          {/* Totals */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-sm space-y-2">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between text-gray-500 text-xs"><span>incl. VAT ({vatRate}%)</span><span>{formatPrice(vatAmount)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{finalShippingCost === 0 ? "Free" : formatPrice(finalShippingCost)}</span></div>
            {discountCode && calculatedDiscount > 0 && <div className="flex justify-between text-green-700"><span>Discount ({discountCode})</span><span>-{formatPrice(calculatedDiscount)}</span></div>}
            <div className="flex justify-between font-bold text-base border-t border-gray-200 dark:border-gray-700 pt-2">
              <span>Total</span><span className="text-green-800">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={form.acceptTerms} onChange={(e) => updateField("acceptTerms", e.target.checked)} className="mt-0.5 rounded border-gray-300 text-green-700 focus:ring-green-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">I accept the <a href={SITE_LINKS.terms.href} target="_blank" className="text-green-700 underline hover:text-green-800">{SITE_LINKS.terms.label}</a> and <a href={SITE_LINKS.privacy.href} target="_blank" className="text-green-700 underline hover:text-green-800">{SITE_LINKS.privacy.label}</a> *</span>
          </label>

          {form.notes !== undefined && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order notes (optional)</label>
              <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={2} maxLength={500} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="Any special requests..." />
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
              <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!, currency: "EUR", locale: "en_US", disableFunding: "paylater,venmo,card,p24,blik,sofort,giropay,sepa,ideal,bancontact,eps,mybank" }}>
                <PayPalButtons
                  style={{ layout: "vertical", shape: "rect", label: "pay", tagline: false }}
                  fundingSource="paypal"
                  disabled={submitting}
                  createOrder={async () => {
                    setSubmitting(true);
                    try {
                      // Step 1: create shop order in pending_payment status (reserves stock, no email yet)
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

                      if (!orderJson.data?.orderNumber || !orderJson.data?.cancelToken) {
                        toast.error(orderJson.message || "Failed to create order");
                        setSubmitting(false);
                        return "";
                      }

                      setPendingOrder({
                        orderNumber: orderJson.data.orderNumber,
                        cancelToken: orderJson.data.cancelToken,
                      });

                      // Step 2: create PayPal session tied to the real orderNumber (reference_id)
                      const ppRes = await fetch("/api/paypal/create-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderNumber: orderJson.data.orderNumber }),
                      });
                      const ppJson = await ppRes.json();

                      if (ppJson.data?.paypalOrderId) {
                        return ppJson.data.paypalOrderId;
                      }

                      // PayPal session failed — release the reservation we just made
                      await releasePendingOrder(orderJson.data.orderNumber, form.email.trim(), orderJson.data.cancelToken);
                      toast.error("Failed to initialize PayPal");
                      setSubmitting(false);
                      return "";
                    } catch {
                      toast.error("Something went wrong");
                      setSubmitting(false);
                      return "";
                    }
                  }}
                  onApprove={async (data) => {
                    try {
                      const orderNumber = pendingOrderRef.current?.orderNumber;
                      if (!orderNumber) {
                        toast.error("Missing order reference");
                        return;
                      }

                      const captureRes = await fetch("/api/paypal/capture-order", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ paypalOrderId: data.orderID, orderNumber }),
                      });
                      const captureJson = await captureRes.json();

                      if (captureJson.data?.status === "COMPLETED") {
                        setOrderPlaced(true);
                        setPendingOrder(null);
                        clearCart();
                        router.push(`/order/confirmation?number=${orderNumber}&email=${encodeURIComponent(form.email.trim())}`);
                      } else {
                        // Capture failed — server auto-cancels and restores stock
                        setPendingOrder(null);
                        toast.error(captureJson.message || "Payment was not completed");
                      }
                    } catch {
                      toast.error("Failed to process payment");
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  onCancel={async () => {
                    const p = pendingOrderRef.current;
                    if (p) {
                      await releasePendingOrder(p.orderNumber, form.email.trim(), p.cancelToken);
                      setPendingOrder(null);
                    }
                    toast.info("Payment cancelled — order released");
                    setSubmitting(false);
                  }}
                  onError={async (err) => {
                    console.error("PayPal error:", err);
                    const p = pendingOrderRef.current;
                    if (p) {
                      await releasePendingOrder(p.orderNumber, form.email.trim(), p.cancelToken);
                      setPendingOrder(null);
                    }
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
                    router.push(`/order/confirmation?number=${placedOrderNumber}&email=${encodeURIComponent(form.email)}`);
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
