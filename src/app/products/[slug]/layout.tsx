import { db } from "@/lib/db";
import { products } from "@/lib/db/schema-pg";
import { eq } from "drizzle-orm";
import { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://leafyshop.eu";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: { category: true },
  });

  if (!product) return { title: "Product Not Found" };

  const canonicalUrl = `${BASE_URL}/products/${product.slug}`;
  const description = product.shortDescription || product.description?.slice(0, 160);

  return {
    title: `${product.name} — Leafy`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${product.name} — Leafy Premium Teas & Coffees`,
      description,
      url: canonicalUrl,
      images: product.imageUrl
        ? [{ url: product.imageUrl, width: 1200, height: 630, alt: product.name }]
        : [],
      type: "website",
    },
  };
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
