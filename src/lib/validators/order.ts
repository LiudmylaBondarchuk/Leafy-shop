import { z } from "zod";

export const orderSchema = z.object({
  items: z
    .array(
      z.object({
        variant_id: z.number(),
        quantity: z.number().min(1),
      })
    )
    .min(1),

  discount_code: z.string().optional(),

  customer: z.object({
    email: z.string().email(),
    phone: z.string().min(9).max(15),
    first_name: z.string().min(2).max(100),
    last_name: z.string().min(2).max(100),
  }),

  shipping: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    zip: z.string().min(5).max(10),
    country: z.string().min(2).max(2).optional(),
    method: z.enum(["courier", "inpost", "pickup"]),
    inpost_code: z.string().optional(),
  }),

  payment: z.object({
    method: z.enum(["cod", "paypal"]),
  }),

  invoice: z.object({
    wants_invoice: z.boolean(),
    company: z.string().optional(),
    nip: z.string().optional(),
    address: z.string().optional(),
  }).optional(),

  notes: z.string().optional(),
});

export type OrderInput = z.infer<typeof orderSchema>;
