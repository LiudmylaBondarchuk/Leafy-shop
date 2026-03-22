import { pgTable, text, integer, boolean, serial, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  shortDescription: text("short_description"),
  imageUrl: text("image_url"),
  productType: text("product_type").notNull(),
  origin: text("origin"),
  brewTempMin: integer("brew_temp_min"),
  brewTempMax: integer("brew_temp_max"),
  brewTimeMin: integer("brew_time_min"),
  brewTimeMax: integer("brew_time_max"),
  flavorNotes: text("flavor_notes"),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  isTestData: boolean("is_test_data").notNull().default(false),
  createdBy: integer("created_by"),
  modifiedBy: integer("modified_by"),
  modifiedAt: text("modified_at"),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  variants: many(productVariants),
}));

export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  weightGrams: integer("weight_grams").notNull(),
  grindType: text("grind_type"),
  price: integer("price").notNull(),
  cost: integer("cost"),
  comparePrice: integer("compare_price"),
  sku: text("sku").notNull().unique(),
  stock: integer("stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
}));

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").notNull().default("new"),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerFirstName: text("customer_first_name").notNull(),
  customerLastName: text("customer_last_name").notNull(),
  shippingStreet: text("shipping_street").notNull(),
  shippingCity: text("shipping_city").notNull(),
  shippingZip: text("shipping_zip").notNull(),
  shippingMethod: text("shipping_method").notNull(),
  shippingCost: integer("shipping_cost").notNull(),
  inpostCode: text("inpost_code"),
  paymentMethod: text("payment_method").notNull(),
  wantsInvoice: boolean("wants_invoice").notNull().default(false),
  invoiceCompany: text("invoice_company"),
  invoiceNip: text("invoice_nip"),
  invoiceAddress: text("invoice_address"),
  subtotal: integer("subtotal").notNull(),
  discountAmount: integer("discount_amount").notNull().default(0),
  discountCodeId: integer("discount_code_id").references(() => discountCodes.id),
  vatRate: integer("vat_rate").notNull().default(0),
  vatAmount: integer("vat_amount").notNull().default(0),
  total: integer("total").notNull(),
  trackingNumber: text("tracking_number"),
  notes: text("notes"),
  internalNotes: text("internal_notes"),
  isTestData: boolean("is_test_data").notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
  discountCode: one(discountCodes, { fields: [orders.discountCodeId], references: [discountCodes.id] }),
}));

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id),
  variantId: integer("variant_id").notNull().references(() => productVariants.id),
  productName: text("product_name").notNull(),
  variantDesc: text("variant_desc").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [orderItems.variantId], references: [productVariants.id] }),
}));

export const orderStatusHistory = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  changedBy: text("changed_by"),
  note: text("note"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
}));

export const discountCodes = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  type: text("type").notNull(),
  value: integer("value").notNull(),
  minOrderValue: integer("min_order_value"),
  maxDiscount: integer("max_discount"),
  categoryId: integer("category_id").references(() => categories.id),
  usageLimit: integer("usage_limit"),
  usageCount: integer("usage_count").notNull().default(0),
  startsAt: text("starts_at").notNull(),
  expiresAt: text("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  isTestData: boolean("is_test_data").notNull().default(false),
  createdBy: integer("created_by"),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const discountCodesRelations = relations(discountCodes, ({ one }) => ({
  category: one(categories, { fields: [discountCodes.categoryId], references: [categories.id] }),
}));

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("manager"),
  permissions: text("permissions").notNull().default("[]"),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: text("last_login_at"),
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ============================================
// AUDIT LOGS
// ============================================
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => adminUsers.id),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  entityName: text("entity_name"),
  changes: text("changes"),
  isTestData: boolean("is_test_data").notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ============================================
// SETTINGS (key-value store)
// ============================================
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});
