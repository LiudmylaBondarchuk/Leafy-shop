import { db } from "@/lib/db";
import { products } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { Metadata } from "next";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: { category: true },
  });

  if (!product) return { title: "Product Not Found" };

  return {
    title: `${product.name} — Leafy`,
    description: product.shortDescription || product.description?.slice(0, 160),
    openGraph: {
      title: `${product.name} — Leafy Premium Teas & Coffees`,
      description: product.shortDescription || product.description?.slice(0, 160),
      images: product.imageUrl ? [{ url: product.imageUrl }] : [],
      type: "website",
    },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
