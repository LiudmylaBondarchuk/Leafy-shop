import { z } from "zod";
import { getCountry } from "@/constants/countries";

const nameRegex = /^[a-zA-ZàáâãäåæçèéêëìíîïðñòóôõöùúûüýþÿĀ-žА-яЁёІіЇїЄє' -]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CheckoutFormInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  street: string;
  city: string;
  zip: string;
  wantsInvoice: boolean;
  company: string;
  nip: string;
  invoiceAddress: string;
  shippingMethod: "courier" | "inpost" | "pickup";
  inpostCode: string;
  paymentMethod: "paypal" | "cod";
  acceptTerms: boolean;
  notes: string;
}

export type CheckoutErrors = Partial<Record<keyof CheckoutFormInput, string>>;

const baseIdentitySchema = z.object({
  firstName: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length >= 2, "First name must be at least 2 characters")
    .refine((v) => nameRegex.test(v), "First name contains invalid characters"),
  lastName: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length >= 2, "Last name must be at least 2 characters")
    .refine((v) => nameRegex.test(v), "Last name contains invalid characters"),
  email: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => emailRegex.test(v), "Invalid email address"),
  street: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "Street is required"),
  city: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "City is required"),
});

function buildStepContactSchema(form: CheckoutFormInput) {
  const country = getCountry(form.country);

  return baseIdentitySchema.extend({
    phone: z
      .string()
      .transform((v) => v.replace(/\s/g, ""))
      .refine((v) => v.length === country.phoneDigits, `Phone must be ${country.phoneDigits} digits for ${country.name}`)
      .refine((v) => /^\d+$/.test(v), "Phone must contain only digits")
      .refine(
        (v) => country.phoneStartsWith.some((prefix) => v.startsWith(prefix)),
        "Invalid phone number"
      ),
    zip: z
      .string()
      .transform((v) => v.trim())
      .refine((v) => v.length > 0, "Zip code is required")
      .refine((v) => country.zipRegex.test(v), `Invalid format for ${country.name} (${country.zipFormat})`),
    wantsInvoice: z.boolean(),
    company: z.string(),
    nip: z.string(),
    invoiceAddress: z.string(),
  }).superRefine((data, ctx) => {
    if (!data.wantsInvoice) return;
    if (!data.company.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["company"], message: "Company name is required" });
    }
    const nip = data.nip.trim();
    if (!nip) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nip"], message: `${country.vatLabel} is required` });
    } else if (!country.validateVat(nip)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nip"], message: `Invalid ${country.vatLabel} for ${country.name}` });
    }
    if (!data.invoiceAddress.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["invoiceAddress"], message: "Company address is required" });
    }
  });
}

const stepShippingSchema = z.object({
  shippingMethod: z.enum(["courier", "inpost", "pickup"]),
  inpostCode: z.string(),
}).superRefine((data, ctx) => {
  if (data.shippingMethod === "inpost" && !data.inpostCode.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["inpostCode"], message: "Parcel locker code is required" });
  }
});

export function validateCheckoutStep(step: number, form: CheckoutFormInput): CheckoutErrors {
  if (step === 0) {
    const result = buildStepContactSchema(form).safeParse(form);
    if (result.success) return {};
    return collectErrors<CheckoutFormInput>(result.error.issues);
  }

  if (step === 1) {
    const result = stepShippingSchema.safeParse(form);
    if (result.success) return {};
    return collectErrors<CheckoutFormInput>(result.error.issues);
  }

  return {};
}

function collectErrors<T>(issues: z.ZodIssue[]): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};
  for (const issue of issues) {
    const key = issue.path[0] as keyof T | undefined;
    if (key && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}
