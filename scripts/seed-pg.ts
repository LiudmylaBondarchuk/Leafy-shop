import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hashSync } from "bcryptjs";
import * as schema from "../src/lib/db/schema-pg";

const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("🌱 Seeding PostgreSQL database...");

  // Clear existing data (order matters for FK)
  await db.delete(schema.orderStatusHistory);
  await db.delete(schema.orderItems);
  await db.delete(schema.orders);
  await db.delete(schema.discountCodes);
  await db.delete(schema.productVariants);
  await db.delete(schema.products);
  await db.delete(schema.categories);
  await db.delete(schema.adminUsers);

  // Categories
  console.log("  📁 Creating categories...");
  const categoryData = [
    { name: "Green Tea", slug: "green-tea", description: "Fresh and grassy Japanese and Chinese green teas", sortOrder: 1 },
    { name: "Black Tea", slug: "black-tea", description: "Bold and full-bodied black teas from around the world", sortOrder: 2 },
    { name: "White Tea", slug: "white-tea", description: "Delicate and subtle white teas", sortOrder: 3 },
    { name: "Herbal Tea", slug: "herbal-tea", description: "Naturally caffeine-free herbal infusions", sortOrder: 4 },
    { name: "Single Origin Coffee", slug: "single-origin-coffee", description: "Specialty single origin coffee beans", sortOrder: 5 },
    { name: "Coffee Blends", slug: "coffee-blends", description: "Carefully crafted coffee blends", sortOrder: 6 },
  ];

  const insertedCategories = await db.insert(schema.categories).values(categoryData).returning();
  const catMap: Record<string, number> = {};
  for (const c of insertedCategories) catMap[c.slug] = c.id;

  // Products
  console.log("  🍵 Creating products...");
  const productsData = [
    {
      product: { categoryId: catMap["green-tea"], name: "Sencha Premium", slug: "sencha-premium", description: "A premium Japanese green tea from Shizuoka prefecture. Steamed and rolled into fine needles, this sencha offers a perfect balance of umami and refreshing grassiness.", shortDescription: "Premium Japanese green tea with rich umami flavor", imageUrl: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=600&h=600&fit=crop", productType: "tea", origin: "Japan, Shizuoka", brewTempMin: 70, brewTempMax: 80, brewTimeMin: 60, brewTimeMax: 120, flavorNotes: "Grassy, umami, marine", isFeatured: true },
      variants: [{ weightGrams: 100, price: 2990, sku: "SEN-PRE-100", stock: 45 }, { weightGrams: 250, price: 5990, sku: "SEN-PRE-250", stock: 30 }, { weightGrams: 500, price: 9990, sku: "SEN-PRE-500", stock: 15 }],
    },
    {
      product: { categoryId: catMap["green-tea"], name: "Ceremonial Matcha", slug: "ceremonial-matcha", description: "Highest grade ceremonial matcha from Uji, Kyoto. Stone-ground to a fine powder, perfect for traditional tea ceremony or a smooth, creamy latte.", shortDescription: "Premium stone-ground matcha from Kyoto", imageUrl: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=600&h=600&fit=crop", productType: "tea", origin: "Japan, Kyoto", brewTempMin: 70, brewTempMax: 80, brewTimeMin: 15, brewTimeMax: 30, flavorNotes: "Sweet, creamy, vegetal", isFeatured: true },
      variants: [{ weightGrams: 30, price: 4990, sku: "MAT-CER-030", stock: 12 }, { weightGrams: 100, price: 12990, sku: "MAT-CER-100", stock: 8 }],
    },
    {
      product: { categoryId: catMap["green-tea"], name: "Gunpowder", slug: "gunpowder", description: "Classic Chinese green tea with tightly rolled leaves that unfurl when brewed. Bold and slightly smoky with a pleasant astringency.", shortDescription: "Classic rolled Chinese green tea", imageUrl: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600&h=600&fit=crop", productType: "tea", origin: "China, Zhejiang", brewTempMin: 75, brewTempMax: 85, brewTimeMin: 120, brewTimeMax: 180, flavorNotes: "Smoky, bold, slightly astringent" },
      variants: [{ weightGrams: 100, price: 1990, sku: "GUN-100", stock: 50 }, { weightGrams: 250, price: 3990, sku: "GUN-250", stock: 35 }],
    },
    {
      product: { categoryId: catMap["black-tea"], name: "Earl Grey Premium", slug: "earl-grey-premium", description: "A refined blend of Ceylon black tea scented with natural bergamot oil. Aromatic and citrusy with a smooth, malty base.", shortDescription: "Classic bergamot-scented black tea", imageUrl: "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=600&h=600&fit=crop", productType: "tea", origin: "Sri Lanka", brewTempMin: 95, brewTempMax: 100, brewTimeMin: 180, brewTimeMax: 300, flavorNotes: "Bergamot, citrus, malty", isFeatured: true },
      variants: [{ weightGrams: 100, price: 2490, sku: "EG-PRE-100", stock: 60 }, { weightGrams: 250, price: 4990, sku: "EG-PRE-250", stock: 40 }, { weightGrams: 500, price: 8990, sku: "EG-PRE-500", stock: 20 }],
    },
    {
      product: { categoryId: catMap["black-tea"], name: "Assam TGFOP", slug: "assam-tgfop", description: "A full-bodied Assam with golden tips. Rich, malty character perfect with milk or enjoyed on its own.", shortDescription: "Full-bodied Indian black tea with golden tips", imageUrl: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&h=600&fit=crop", productType: "tea", origin: "India, Assam", brewTempMin: 95, brewTempMax: 100, brewTimeMin: 180, brewTimeMax: 300, flavorNotes: "Malty, rich, honey" },
      variants: [{ weightGrams: 100, price: 2990, sku: "ASM-TGF-100", stock: 25 }, { weightGrams: 250, price: 5990, sku: "ASM-TGF-250", stock: 15 }],
    },
    {
      product: { categoryId: catMap["black-tea"], name: "Darjeeling First Flush", slug: "darjeeling-first-flush", description: "The 'Champagne of Teas'. First flush picking from the Himalayan foothills. Light, floral, and muscatel character.", shortDescription: "The champagne of teas from the Himalayas", imageUrl: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&h=600&fit=crop", productType: "tea", origin: "India, Darjeeling", brewTempMin: 85, brewTempMax: 95, brewTimeMin: 120, brewTimeMax: 240, flavorNotes: "Floral, muscatel, light" },
      variants: [{ weightGrams: 100, price: 3990, sku: "DAR-FF-100", stock: 10 }, { weightGrams: 250, price: 7990, sku: "DAR-FF-250", stock: 5 }],
    },
    {
      product: { categoryId: catMap["white-tea"], name: "Pai Mu Tan", slug: "pai-mu-tan", description: "White Peony tea with both buds and young leaves. Delicate, sweet flavor with subtle fruity notes.", shortDescription: "Delicate white tea with sweet fruity notes", imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&h=600&fit=crop", productType: "tea", origin: "China, Fujian", brewTempMin: 75, brewTempMax: 85, brewTimeMin: 180, brewTimeMax: 300, flavorNotes: "Sweet, fruity, delicate" },
      variants: [{ weightGrams: 50, price: 3490, sku: "PMT-050", stock: 15 }, { weightGrams: 100, price: 5990, sku: "PMT-100", stock: 10 }],
    },
    {
      product: { categoryId: catMap["white-tea"], name: "Silver Needle", slug: "silver-needle", description: "The most prized white tea, made exclusively from unopened buds covered in fine white hair. Exquisitely delicate with a sweet, honeyed flavor.", shortDescription: "Exquisite bud-only white tea", imageUrl: "https://images.unsplash.com/photo-1523920290228-4f321a939b4c?w=600&h=600&fit=crop", productType: "tea", origin: "China, Fujian", brewTempMin: 70, brewTempMax: 80, brewTimeMin: 240, brewTimeMax: 420, flavorNotes: "Honey, sweet, ethereal" },
      variants: [{ weightGrams: 50, price: 4990, sku: "SN-050", stock: 3 }, { weightGrams: 100, price: 8990, sku: "SN-100", stock: 2 }],
    },
    {
      product: { categoryId: catMap["herbal-tea"], name: "Fruit Paradise", slug: "fruit-paradise", description: "A vibrant blend of hibiscus, rosehip, apple pieces, and tropical fruits. Naturally sweet and refreshing, perfect hot or iced.", shortDescription: "Vibrant tropical fruit infusion", imageUrl: "https://images.unsplash.com/photo-1574914629385-46448b767aec?w=600&h=600&fit=crop", productType: "tea", origin: "Germany (blend)", brewTempMin: 95, brewTempMax: 100, brewTimeMin: 300, brewTimeMax: 600, flavorNotes: "Fruity, sweet, tangy" },
      variants: [{ weightGrams: 100, price: 1490, sku: "FP-100", stock: 50 }, { weightGrams: 250, price: 2990, sku: "FP-250", stock: 35 }, { weightGrams: 500, price: 4990, sku: "FP-500", stock: 20 }],
    },
    {
      product: { categoryId: catMap["herbal-tea"], name: "Forest Berry Mix", slug: "forest-berry-mix", description: "A rich blend of wild forest berries including blueberry, elderberry, and blackberry. Deep, fruity aroma with a naturally sweet taste.", shortDescription: "Wild forest berry infusion", imageUrl: "https://images.unsplash.com/photo-1598618443855-232ee0f819f6?w=600&h=600&fit=crop", productType: "tea", origin: "Germany (blend)", brewTempMin: 95, brewTempMax: 100, brewTimeMin: 300, brewTimeMax: 600, flavorNotes: "Berry, sweet, deep" },
      variants: [{ weightGrams: 100, price: 1490, sku: "FBM-100", stock: 40 }, { weightGrams: 250, price: 2990, sku: "FBM-250", stock: 0 }],
    },
    {
      product: { categoryId: catMap["single-origin-coffee"], name: "Ethiopia Yirgacheffe", slug: "ethiopia-yirgacheffe", description: "A bright and complex Ethiopian coffee with pronounced blueberry and floral notes. Light roast to preserve its distinctive character.", shortDescription: "Bright Ethiopian coffee with blueberry notes", imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&h=600&fit=crop", productType: "coffee", origin: "Ethiopia, Yirgacheffe", brewTempMin: 92, brewTempMax: 96, flavorNotes: "Blueberry, floral, citrus", isFeatured: true },
      variants: [{ weightGrams: 250, grindType: "whole_bean", price: 4990, sku: "ETH-YIR-250-WB", stock: 35 }, { weightGrams: 250, grindType: "medium", price: 5290, sku: "ETH-YIR-250-MED", stock: 20 }, { weightGrams: 500, grindType: "whole_bean", price: 8990, sku: "ETH-YIR-500-WB", stock: 15 }],
    },
    {
      product: { categoryId: catMap["single-origin-coffee"], name: "Colombia Supremo", slug: "colombia-supremo", description: "A well-balanced Colombian coffee with caramel sweetness and a nutty finish. Medium roast, perfect for everyday enjoyment.", shortDescription: "Balanced Colombian with caramel and nuts", imageUrl: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=600&h=600&fit=crop", productType: "coffee", origin: "Colombia, Huila", brewTempMin: 92, brewTempMax: 96, flavorNotes: "Caramel, nutty, chocolate" },
      variants: [{ weightGrams: 250, grindType: "whole_bean", price: 4490, sku: "COL-SUP-250-WB", stock: 28 }, { weightGrams: 250, grindType: "medium", price: 4790, sku: "COL-SUP-250-MED", stock: 18 }, { weightGrams: 500, grindType: "whole_bean", price: 7990, sku: "COL-SUP-500-WB", stock: 12 }],
    },
    {
      product: { categoryId: catMap["single-origin-coffee"], name: "Brazil Santos", slug: "brazil-santos", description: "A smooth and mild Brazilian coffee with low acidity. Notes of dark chocolate and toasted nuts. Great for espresso.", shortDescription: "Smooth Brazilian coffee, great for espresso", imageUrl: "https://images.unsplash.com/photo-1611854779393-1b2da9d400fe?w=600&h=600&fit=crop", productType: "coffee", origin: "Brazil, Santos", brewTempMin: 92, brewTempMax: 96, flavorNotes: "Chocolate, nuts, smooth" },
      variants: [{ weightGrams: 250, grindType: "whole_bean", price: 3990, sku: "BRA-SAN-250-WB", stock: 50 }, { weightGrams: 500, grindType: "whole_bean", price: 6990, sku: "BRA-SAN-500-WB", stock: 30 }, { weightGrams: 1000, grindType: "whole_bean", price: 11990, sku: "BRA-SAN-1000-WB", stock: 0 }],
    },
    {
      product: { categoryId: catMap["coffee-blends"], name: "Italian Espresso Blend", slug: "italian-espresso-blend", description: "A traditional Italian-style espresso blend. Dark roasted for a bold, intense shot with thick crema.", shortDescription: "Bold Italian-style espresso blend", imageUrl: "https://images.unsplash.com/photo-1610889556528-9a770e32642f?w=600&h=600&fit=crop", productType: "coffee", origin: "Blend (Brazil, India, Ethiopia)", brewTempMin: 92, brewTempMax: 96, flavorNotes: "Bold, intense, dark chocolate" },
      variants: [{ weightGrams: 250, grindType: "espresso", price: 3990, sku: "ITA-ESP-250-ESP", stock: 40 }, { weightGrams: 500, grindType: "espresso", price: 6990, sku: "ITA-ESP-500-ESP", stock: 25 }],
    },
    {
      product: { categoryId: catMap["coffee-blends"], name: "Morning Blend", slug: "morning-blend", description: "A gentle, approachable blend perfect for your morning cup. Medium roast with a clean finish and pleasant sweetness.", shortDescription: "Gentle medium roast for your morning ritual", imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop", productType: "coffee", origin: "Blend (Colombia, Guatemala)", brewTempMin: 92, brewTempMax: 96, flavorNotes: "Clean, sweet, balanced", isFeatured: true },
      variants: [{ weightGrams: 250, grindType: "medium", price: 3490, sku: "MOR-BLE-250-MED", stock: 55 }, { weightGrams: 500, grindType: "medium", price: 5990, sku: "MOR-BLE-500-MED", stock: 35 }],
    },
  ];

  for (const { product, variants } of productsData) {
    const [inserted] = await db.insert(schema.products).values(product).returning();
    for (const v of variants) {
      await db.insert(schema.productVariants).values({ productId: inserted.id, ...v });
    }
  }

  // Discount codes
  console.log("  🏷️  Creating discount codes...");
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const futureDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString();

  await db.insert(schema.discountCodes).values([
    { code: "WELCOME10", description: "10% off for new customers", type: "percentage", value: 1000, minOrderValue: 5000, startsAt: pastDate, expiresAt: futureDate },
    { code: "GREENTEA20", description: "20% off green tea", type: "percentage", value: 2000, maxDiscount: 3000, categoryId: catMap["green-tea"], startsAt: pastDate, expiresAt: futureDate },
    { code: "COFFEE15", description: "$15 off coffee orders", type: "fixed_amount", value: 1500, minOrderValue: 8000, usageLimit: 1, startsAt: pastDate, expiresAt: futureDate },
    { code: "FREESHIP", description: "Free shipping", type: "free_shipping", value: 0, minOrderValue: 5000, startsAt: pastDate, expiresAt: futureDate },
    { code: "EXPIRED", description: "Expired test code", type: "percentage", value: 1000, startsAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), expiresAt: pastDate },
    { code: "USED", description: "Already used single-use code", type: "percentage", value: 500, usageLimit: 1, usageCount: 1, startsAt: pastDate, expiresAt: futureDate },
  ]);

  // Admin
  console.log("  👤 Creating admin user...");
  const passwordHash = hashSync("Admin123!", 12);
  await db.insert(schema.adminUsers).values({ email: "admin@leafy.pl", passwordHash, name: "Administrator" });

  console.log("✅ PostgreSQL seed complete!");
}

seed().catch((err) => { console.error("❌ Seed failed:", err); process.exit(1); });
