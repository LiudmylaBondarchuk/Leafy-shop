import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { getAdminFromCookie } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401);

  const all = await db.select().from(categories).orderBy(categories.sortOrder);
  return apiSuccess(all);
}

export async function POST(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401);

  const body = await request.json();
  const { name, description, imageUrl } = body;

  if (!name?.trim()) return apiError("Category name is required", 400);

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Check for duplicate slug
  const existing = await db.select().from(categories).where(eq(categories.slug, slug));
  if (existing.length > 0) return apiError("A category with this name already exists", 400);

  // Get max sort order
  const all = await db.select().from(categories);
  const maxSort = all.reduce((max: number, c: any) => Math.max(max, c.sortOrder), 0);

  const [created] = await db.insert(categories).values({
    name: name.trim(),
    slug,
    description: description?.trim() || null,
    imageUrl: imageUrl?.trim() || null,
    sortOrder: maxSort + 1,
  }).returning();

  return apiSuccess(created);
}

export async function PUT(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401);

  const body = await request.json();
  const { id, name, description, imageUrl } = body;

  if (!id) return apiError("Category ID is required", 400);
  if (!name?.trim()) return apiError("Category name is required", 400);

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Check for duplicate slug (excluding current)
  const existing = await db.select().from(categories).where(eq(categories.slug, slug));
  if (existing.length > 0 && existing[0].id !== id) {
    return apiError("A category with this name already exists", 400);
  }

  const [updated] = await db.update(categories).set({
    name: name.trim(),
    slug,
    description: description?.trim() || null,
    imageUrl: imageUrl?.trim() || null,
    updatedAt: new Date().toISOString(),
  }).where(eq(categories.id, id)).returning();

  return apiSuccess(updated);
}

export async function DELETE(request: Request) {
  const admin = await getAdminFromCookie();
  if (!admin) return apiError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const id = parseInt(searchParams.get("id") || "0");
  if (!id) return apiError("Category ID is required", 400);

  // Check if category has products
  const { products } = await import("@/lib/db/schema-pg");
  const prods = await db.select().from(products).where(eq(products.categoryId, id));
  if (prods.length > 0) {
    return apiError(`Cannot delete: ${prods.length} product(s) use this category`, 400);
  }

  await db.delete(categories).where(eq(categories.id, id));
  return apiSuccess({ deleted: true });
}
