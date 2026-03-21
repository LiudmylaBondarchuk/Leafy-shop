// Re-export tables from the correct schema based on environment
// This file is the single source of truth for table references

export {
  categories,
  categoriesRelations,
  products,
  productsRelations,
  productVariants,
  productVariantsRelations,
  orders,
  ordersRelations,
  orderItems,
  orderItemsRelations,
  orderStatusHistory,
  orderStatusHistoryRelations,
  discountCodes,
  discountCodesRelations,
  adminUsers,
} from "./schema-pg";
