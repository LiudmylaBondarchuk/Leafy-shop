import { sqliteTable, text, integer, real, uniqueIndex, index } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ============================================
// CATEGORIES
// ============================================
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name", { length: 100 }).notNull().unique(),
  slug: text("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

// ============================================
// PRODUCTS
// ============================================
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  name: text("name", { length: 200 }).notNull(),
  slug: text("slug", { length: 200 }).notNull().unique(),
  description: text("description").notNull(),
  shortDescription: text("short_description", { length: 500 }),
  imageUrl: text("image_url"),
  productType: text("product_type", { length: 20 }).notNull(), // 'tea' | 'coffee'
  origin: text("origin", { length: 100 }),
  brewTempMin: integer("brew_temp_min"),
  brewTempMax: integer("brew_temp_max"),
  brewTimeMin: integer("brew_time_min"), // seconds
  brewTimeMax: integer("brew_time_max"), // seconds
  flavorNotes: text("flavor_notes", { length: 200 }),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  isFeatured: integer("is_featured", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("idx_products_category").on(table.categoryId),
  index("idx_products_type").on(table.productType),
  index("idx_products_active_featured").on(table.isActive, table.isFeatured),
]);

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  variants: many(productVariants),
}));

// ============================================
// PRODUCT VARIANTS
// ============================================
export const productVariants = sqliteTable("product_variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  weightGrams: integer("weight_grams").notNull(),
  grindType: text("grind_type", { length: 30 }), // null for tea, 'whole_bean'|'fine'|'medium'|'coarse'|'espresso' for coffee
  price: integer("price").notNull(), // in cents (grosze)
  comparePrice: integer("compare_price"), // original price before discount, in cents
  sku: text("sku", { length: 50 }).notNull().unique(),
  stock: integer("stock").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("idx_variants_product").on(table.productId),
]);

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

// ============================================
// ORDERS
// ============================================
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderNumber: text("order_number", { length: 20 }).notNull().unique(),
  status: text("status", { length: 20 }).notNull().default("new"),
  customerEmail: text("customer_email", { length: 200 }).notNull(),
  customerPhone: text("customer_phone", { length: 20 }).notNull(),
  customerFirstName: text("customer_first_name", { length: 100 }).notNull(),
  customerLastName: text("customer_last_name", { length: 100 }).notNull(),
  shippingStreet: text("shipping_street", { length: 200 }).notNull(),
  shippingCity: text("shipping_city", { length: 100 }).notNull(),
  shippingZip: text("shipping_zip", { length: 10 }).notNull(),
  shippingMethod: text("shipping_method", { length: 30 }).notNull(), // 'courier'|'inpost'|'pickup'
  shippingCost: integer("shipping_cost").notNull(),
  inpostCode: text("inpost_code", { length: 20 }),
  paymentMethod: text("payment_method", { length: 30 }).notNull(), // 'blik'|'card'|'transfer'|'cod'
  wantsInvoice: integer("wants_invoice", { mode: "boolean" }).notNull().default(false),
  invoiceCompany: text("invoice_company", { length: 200 }),
  invoiceNip: text("invoice_nip", { length: 10 }),
  invoiceAddress: text("invoice_address", { length: 300 }),
  subtotal: integer("subtotal").notNull(),
  discountAmount: integer("discount_amount").notNull().default(0),
  discountCodeId: integer("discount_code_id").references(() => discountCodes.id),
  total: integer("total").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("idx_orders_number").on(table.orderNumber),
  index("idx_orders_status").on(table.status),
  index("idx_orders_email").on(table.customerEmail),
  index("idx_orders_created").on(table.createdAt),
]);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
  discountCode: one(discountCodes, {
    fields: [orders.discountCodeId],
    references: [discountCodes.id],
  }),
}));

// ============================================
// ORDER ITEMS
// ============================================
export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  variantId: integer("variant_id").notNull().references(() => productVariants.id),
  productName: text("product_name", { length: 200 }).notNull(),
  variantDesc: text("variant_desc", { length: 100 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

// ============================================
// ORDER STATUS HISTORY
// ============================================
export const orderStatusHistory = sqliteTable("order_status_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: text("from_status", { length: 20 }),
  toStatus: text("to_status", { length: 20 }).notNull(),
  changedBy: text("changed_by", { length: 100 }),
  note: text("note"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusHistory.orderId],
    references: [orders.id],
  }),
}));

// ============================================
// DISCOUNT CODES
// ============================================
export const discountCodes = sqliteTable("discount_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code", { length: 50 }).notNull().unique(),
  description: text("description", { length: 200 }),
  type: text("type", { length: 20 }).notNull(), // 'percentage'|'fixed_amount'|'free_shipping'
  value: integer("value").notNull(), // percentage: 1000=10%, fixed: cents
  minOrderValue: integer("min_order_value"),
  maxDiscount: integer("max_discount"),
  categoryId: integer("category_id").references(() => categories.id),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").notNull().default(0),
  startsAt: text("starts_at").notNull(),
  expiresAt: text("expires_at"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index("idx_discount_code").on(table.code),
  index("idx_discount_active").on(table.isActive, table.expiresAt),
]);

export const discountCodesRelations = relations(discountCodes, ({ one }) => ({
  category: one(categories, {
    fields: [discountCodes.categoryId],
    references: [categories.id],
  }),
}));

// ============================================
// CREDIT NOTES (faktury korygujące)
// ============================================
export const creditNotes = sqliteTable("credit_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  creditNoteNumber: text("credit_note_number").notNull().unique(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  originalInvoiceNumber: text("original_invoice_number").notNull(),
  reason: text("reason").notNull().default("Order cancelled"),
  subtotal: integer("subtotal").notNull(),
  discountAmount: integer("discount_amount").notNull().default(0),
  shippingCost: integer("shipping_cost").notNull().default(0),
  vatRate: integer("vat_rate").notNull().default(0),
  vatAmount: integer("vat_amount").notNull().default(0),
  total: integer("total").notNull(),
  customerEmail: text("customer_email").notNull(),
  emailSent: integer("email_sent", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const creditNotesRelations = relations(creditNotes, ({ one }) => ({
  order: one(orders, { fields: [creditNotes.orderId], references: [orders.id] }),
}));

// ============================================
// ADMIN USERS
// ============================================
export const adminUsers = sqliteTable("admin_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email", { length: 200 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name", { length: 100 }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
