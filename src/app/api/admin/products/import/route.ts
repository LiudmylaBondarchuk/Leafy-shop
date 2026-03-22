import { db } from "@/lib/db";
import { products, productVariants, categories, adminUsers } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError, slugify } from "@/lib/utils";
import { logAudit } from "@/lib/audit";

interface CSVRow {
  name: string;
  description: string;
  shortDescription?: string;
  category: string;
  productType: string;
  origin?: string;
  imageUrl?: string;
  isFeatured?: string;
  weightGrams: string;
  price: string;
  cost?: string;
  stock?: string;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = values[idx]; });
      rows.push(row);
    }
  }

  return rows;
}

export async function POST(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return apiError("No file uploaded", 400);

    if (!file.name.endsWith('.csv') && !file.type.includes('text')) {
      return apiError("Only CSV files are allowed", 400);
    }

    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length === 0) return apiError("CSV is empty or has invalid format", 400);

    // Validate required columns
    const required = ["name", "description", "category", "productType", "weightGrams", "price"];
    const headers = Object.keys(rows[0]);
    const missing = required.filter((r) => !headers.includes(r));
    if (missing.length > 0) {
      return apiError(`Missing required columns: ${missing.join(", ")}`, 400);
    }

    const requestingUser = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, Number(admin.sub)),
    });
    const isTester = requestingUser?.role === "tester";

    // Cache categories
    const allCategories = await db.select().from(categories);
    const catMap = new Map(allCategories.map((c: any) => [c.name.toLowerCase(), c.id]));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Group rows by product name (multiple variants per product)
    const grouped = new Map<string, Record<string, string>[]>();
    for (const row of rows) {
      const key = row.name?.trim();
      if (!key) { skipped++; continue; }
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    }

    for (const [name, productRows] of grouped) {
      const first = productRows[0];
      const categoryId = catMap.get(first.category?.trim().toLowerCase());
      if (!categoryId) {
        errors.push(`"${name}": unknown category "${first.category}"`);
        skipped += productRows.length;
        continue;
      }

      const productType = first.productType?.trim().toLowerCase();
      if (productType !== "tea" && productType !== "coffee") {
        errors.push(`"${name}": productType must be "tea" or "coffee"`);
        skipped += productRows.length;
        continue;
      }

      let slug = slugify(name);
      const existing = await db.query.products.findFirst({ where: eq(products.slug, slug) });
      if (existing) slug = `${slug}-${Date.now()}`;

      const [product] = await db.insert(products).values({
        name,
        slug,
        description: first.description?.trim() || "",
        shortDescription: first.shortDescription?.trim() || null,
        categoryId,
        productType,
        origin: first.origin?.trim() || null,
        imageUrl: first.imageUrl?.trim() || null,
        isActive: true,
        isFeatured: first.isFeatured === "true" || first.isFeatured === "1",
        isTestData: isTester,
        createdBy: Number(admin.sub),
      }).returning();

      for (const row of productRows) {
        const price = Math.round(parseFloat(row.price) * 100);
        const cost = row.cost ? Math.round(parseFloat(row.cost) * 100) : null;
        const stock = parseInt(row.stock || "0") || 0;
        const weightGrams = parseInt(row.weightGrams) || 100;

        if (isNaN(price) || price <= 0) {
          errors.push(`"${name}": invalid price "${row.price}"`);
          continue;
        }

        await db.insert(productVariants).values({
          productId: product.id,
          weightGrams,
          price,
          cost,
          stock,
          sku: `${slug}-${weightGrams}-${Date.now()}`,
          isActive: true,
        });
      }

      logAudit({
        userId: Number(admin.sub),
        userName: requestingUser?.name || "Unknown",
        userRole: requestingUser?.role || "unknown",
        action: "create",
        entityType: "product",
        entityId: product.id,
        entityName: name,
        isTestData: isTester,
      });

      imported++;
    }

    return apiSuccess({ imported, skipped, errors });
  } catch (error) {
    console.error("POST /api/admin/products/import error:", error instanceof Error ? error.message : "Unknown error");
    return apiError("Failed to import products", 500);
  }
}
