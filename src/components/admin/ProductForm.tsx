"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Variant {
  id?: number;
  weightGrams: number;
  grindType: string;
  price: number; // in cents (selling price)
  cost: number | null; // in cents (purchase cost)
  comparePrice: number | null;
  sku: string;
  stock: number;
  isActive?: boolean;
}

interface ProductFormProps {
  productId?: number; // if editing
}

export function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string; slug: string }[]>([]);

  const [form, setForm] = useState({
    name: "",
    description: "",
    shortDescription: "",
    categoryId: 0,
    productType: "tea" as "tea" | "coffee",
    origin: "",
    brewTempMin: "",
    brewTempMax: "",
    brewTimeMin: "",
    brewTimeMax: "",
    flavorNotes: "",
    imageUrl: "",
    isActive: true,
    isFeatured: false,
  });

  const [variants, setVariants] = useState<Variant[]>([
    { weightGrams: 100, grindType: "", price: 0, cost: null, comparePrice: null, sku: "", stock: 0 },
  ]);

  // Fetch categories
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => {
        const cats = json.data || [];
        setCategories(cats);
        if (!productId && cats.length > 0) {
          setForm((f) => ({ ...f, categoryId: cats[0].id }));
        }
      });
  }, [productId]);

  // Fetch existing product for editing
  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetch(`/api/admin/products/${productId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const p = json.data;
          setForm({
            name: p.name,
            description: p.description,
            shortDescription: p.shortDescription || "",
            categoryId: p.categoryId,
            productType: p.productType,
            origin: p.origin || "",
            brewTempMin: p.brewTempMin?.toString() || "",
            brewTempMax: p.brewTempMax?.toString() || "",
            brewTimeMin: p.brewTimeMin?.toString() || "",
            brewTimeMax: p.brewTimeMax?.toString() || "",
            flavorNotes: p.flavorNotes || "",
            imageUrl: p.imageUrl || "",
            isActive: p.isActive,
            isFeatured: p.isFeatured,
          });
          setVariants(
            (p.variants as Variant[]).map((v) => ({
              id: v.id,
              weightGrams: v.weightGrams,
              grindType: v.grindType || "",
              price: v.price,
              cost: v.cost,
              comparePrice: v.comparePrice,
              sku: v.sku,
              stock: v.stock,
              isActive: v.isActive,
            }))
          );
        }
        setLoading(false);
      });
  }, [productId]);

  // Only allow positive numbers with max limit
  const positiveNumber = (val: string, max?: number): string => {
    const clean = val.replace(/[^0-9]/g, "");
    if (max && clean && Number(clean) > max) return String(max);
    return clean;
  };

  const getCategoryType = (catId: number): "tea" | "coffee" => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return "tea";
    const name = cat.name.toLowerCase();
    return name.includes("coffee") ? "coffee" : "tea";
  };

  const updateForm = <K extends keyof typeof form>(field: K, value: (typeof form)[K]) => {
    setForm((f) => {
      const updated = { ...f, [field]: value };
      if (field === "categoryId") {
        updated.productType = getCategoryType(Number(value));
      }
      return updated;
    });

    if (field === "categoryId" && getCategoryType(Number(value)) === "tea") {
      setVariants((vs) => vs.map((v) => ({ ...v, grindType: "" })));
    }
  };

  const updateVariant = <K extends keyof Variant>(index: number, field: K, value: Variant[K]) => {
    setVariants((vs) => vs.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  };

  const addVariant = () => {
    setVariants((vs) => [
      ...vs,
      { weightGrams: 100, grindType: "", price: 0, cost: null, comparePrice: null, sku: "", stock: 0 },
    ]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) { toast.error("At least one variant is required"); return; }
    setVariants((vs) => vs.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (!form.description.trim()) { toast.error("Description is required"); return; }
    if (!form.categoryId) { toast.error("Category is required"); return; }

    // Brewing details validation
    const tempMin = form.brewTempMin ? Number(form.brewTempMin) : null;
    const tempMax = form.brewTempMax ? Number(form.brewTempMax) : null;
    const timeMin = form.brewTimeMin ? Number(form.brewTimeMin) : null;
    const timeMax = form.brewTimeMax ? Number(form.brewTimeMax) : null;

    if (tempMin !== null && tempMin < 0) { toast.error("Please enter a valid minimum temperature"); return; }
    if (tempMax !== null && tempMax < 0) { toast.error("Please enter a valid maximum temperature"); return; }
    if (timeMin !== null && timeMin < 0) { toast.error("Please enter a valid minimum brew time"); return; }
    if (timeMax !== null && timeMax < 0) { toast.error("Please enter a valid maximum brew time"); return; }
    if (tempMin !== null && tempMax !== null && tempMin > tempMax) { toast.error("Minimum temperature should be lower than maximum"); return; }
    if (timeMin !== null && timeMax !== null && timeMin > timeMax) { toast.error("Minimum brew time should be lower than maximum"); return; }

    for (let i = 0; i < variants.length; i++) {
      if (variants[i].price <= 0) { toast.error(`Variant ${i + 1}: price must be greater than 0`); return; }
      if (variants[i].weightGrams <= 0) { toast.error(`Variant ${i + 1}: weight must be greater than 0`); return; }
      if (variants[i].stock < 0) { toast.error(`Variant ${i + 1}: stock cannot be negative`); return; }
      if (variants[i].comparePrice !== null && variants[i].comparePrice! < 0) { toast.error(`Variant ${i + 1}: compare price cannot be negative`); return; }
    }

    setSaving(true);

    const payload = {
      ...form,
      categoryId: Number(form.categoryId),
      brewTempMin: form.brewTempMin ? Number(form.brewTempMin) : null,
      brewTempMax: form.brewTempMax ? Number(form.brewTempMax) : null,
      brewTimeMin: form.brewTimeMin ? Number(form.brewTimeMin) : null,
      brewTimeMax: form.brewTimeMax ? Number(form.brewTimeMax) : null,
      variants: variants.map((v) => ({
        ...v,
        grindType: v.grindType || null,
      })),
    };

    try {
      const url = productId ? `/api/admin/products/${productId}` : "/api/admin/products";
      const method = productId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.data) {
        toast.success(productId ? "Product updated" : "Product created");
        router.push("/management/products");
      } else {
        toast.error(json.message || "Failed to save product");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-400 py-8">Loading product...</div>;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Basic info */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Basic Information</h2>
        <Input label="Product name *" id="name" value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="e.g. Sencha Premium" />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
          <textarea value={form.description} onChange={(e) => updateForm("description", e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="Full product description..." />
        </div>
        <Input label="Short description" id="shortDesc" value={form.shortDescription} onChange={(e) => updateForm("shortDescription", e.target.value)} placeholder="Brief summary for product cards" />
        <Input label="Image URL" id="imageUrl" value={form.imageUrl} onChange={(e) => updateForm("imageUrl", e.target.value)} placeholder="https://images.unsplash.com/..." />
        {form.imageUrl && (
          <div className="w-24 h-24 rounded-lg overflow-hidden">
            <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
      </Card>

      {/* Category & Type */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Category & Type</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <select value={form.categoryId} onChange={(e) => updateForm("categoryId", Number(e.target.value))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Type: <strong>{form.productType === "coffee" ? "Coffee" : "Tea"}</strong> (based on category)
          </p>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => updateForm("isActive", e.target.checked)} className="rounded border-gray-300 text-green-700 focus:ring-green-600" />
            <span className="text-sm text-gray-700">Active (visible in store)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => updateForm("isFeatured", e.target.checked)} className="rounded border-gray-300 text-green-700 focus:ring-green-600" />
            <span className="text-sm text-gray-700">★ Bestseller</span>
          </label>
        </div>
      </Card>

      {/* Brewing details */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Details (optional)</h2>
        <Input label="Origin" id="origin" value={form.origin} onChange={(e) => updateForm("origin", e.target.value)} placeholder="e.g. Japan, Shizuoka" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <Input label="Temp min (°C)" id="tempMin" value={form.brewTempMin} onChange={(e) => updateForm("brewTempMin", positiveNumber(e.target.value, 100))} placeholder="70" />
            <p className="text-xs text-gray-400 mt-0.5">Max 100°C</p>
          </div>
          <div>
            <Input label="Temp max (°C)" id="tempMax" value={form.brewTempMax} onChange={(e) => updateForm("brewTempMax", positiveNumber(e.target.value, 100))} placeholder="80" />
            <p className="text-xs text-gray-400 mt-0.5">Max 100°C</p>
          </div>
          <div>
            <Input label="Time min (sec)" id="timeMin" value={form.brewTimeMin} onChange={(e) => updateForm("brewTimeMin", positiveNumber(e.target.value, 3600))} placeholder="60" />
            <p className="text-xs text-gray-400 mt-0.5">60 = 1 min</p>
          </div>
          <div>
            <Input label="Time max (sec)" id="timeMax" value={form.brewTimeMax} onChange={(e) => updateForm("brewTimeMax", positiveNumber(e.target.value, 3600))} placeholder="120" />
            <p className="text-xs text-gray-400 mt-0.5">300 = 5 min</p>
          </div>
        </div>
        <Input label="Flavor notes" id="flavorNotes" value={form.flavorNotes} onChange={(e) => updateForm("flavorNotes", e.target.value)} placeholder="e.g. Grassy, umami, marine" />
      </Card>

      {/* Variants */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Variants</h2>
          <Button variant="secondary" size="sm" onClick={addVariant}>
            <Plus className="h-4 w-4 mr-1" /> Add Variant
          </Button>
        </div>

        {variants.map((v, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Variant {i + 1}</span>
              <button onClick={() => removeVariant(i)} className="text-gray-400 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Weight (g) *</label>
                <input value={v.weightGrams || ""} onChange={(e) => updateVariant(i, "weightGrams", Number(positiveNumber(e.target.value)))} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="100" />
                <p className="text-xs text-gray-400 mt-0.5">e.g. 100, 250, 500</p>
              </div>
              {form.productType === "coffee" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Grind</label>
                  <select value={v.grindType} onChange={(e) => updateVariant(i, "grindType", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                    <option value="">Whole Bean</option>
                    <option value="whole_bean">Whole Bean</option>
                    <option value="fine">Fine Ground</option>
                    <option value="medium">Medium Ground</option>
                    <option value="coarse">Coarse Ground</option>
                    <option value="espresso">Espresso</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-0.5">Only for coffee products</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price (cents) *</label>
                <input value={v.price || ""} onChange={(e) => updateVariant(i, "price", Number(positiveNumber(e.target.value, 9999999)))} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="2990" />
                {v.price > 0 && <p className="text-xs text-gray-400 mt-0.5">€{(v.price / 100).toFixed(2)}</p>}
                {!v.price && <p className="text-xs text-gray-400 mt-0.5">e.g. 2990 = €29.90</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cost (cents)</label>
                <input value={v.cost || ""} onChange={(e) => updateVariant(i, "cost", e.target.value ? Number(positiveNumber(e.target.value, 9999999)) : null)} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="1500" />
                {v.cost && v.cost > 0 && <p className="text-xs text-gray-400 mt-0.5">${(v.cost / 100).toFixed(2)} cost{v.price > 0 ? ` → $${((v.price - v.cost) / 100).toFixed(2)} margin` : ""}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Stock *</label>
                <input value={v.stock} onChange={(e) => updateVariant(i, "stock", Number(positiveNumber(e.target.value, 99999)))} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">SKU</label>
                <input type="text" value={v.sku || ""} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-500 cursor-not-allowed" placeholder={productId ? "" : "Auto-generated on save"} />
                {!productId && !v.sku && <p className="text-xs text-gray-400 mt-0.5">Generated automatically</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Compare price (cents)</label>
                <input value={v.comparePrice || ""} onChange={(e) => updateVariant(i, "comparePrice", e.target.value ? Number(positiveNumber(e.target.value, 9999999)) : null)} className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" placeholder="Old price" />
                {v.comparePrice && v.comparePrice > 0 && <p className="text-xs text-gray-400 mt-0.5">${(v.comparePrice / 100).toFixed(2)}</p>}
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.push("/management/products")}>Cancel</Button>
        <Button onClick={handleSubmit} loading={saving}>
          {productId ? "Save Changes" : "Create Product"}
        </Button>
      </div>
    </div>
  );
}
