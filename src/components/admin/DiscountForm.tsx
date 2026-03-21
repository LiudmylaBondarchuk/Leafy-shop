"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface DiscountFormProps {
  discountId?: number;
}

export function DiscountForm({ discountId }: DiscountFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "percentage" as "percentage" | "fixed_amount" | "free_shipping",
    value: "",
    minOrderValue: "",
    maxDiscount: "",
    categoryId: "",
    usageLimit: "",
    startsAt: new Date().toISOString().split("T")[0],
    expiresAt: "",
    isActive: true,
  });

  const positiveNumber = (val: string, max?: number): string => {
    const clean = val.replace(/[^0-9]/g, "");
    if (max && clean && Number(clean) > max) return String(max);
    return clean;
  };

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((json) => setCategories(json.data || []));
  }, []);

  useEffect(() => {
    if (!discountId) return;
    setLoading(true);
    fetch(`/api/admin/discounts/${discountId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const d = json.data;
          setForm({
            code: d.code,
            description: d.description || "",
            type: d.type,
            value: d.type === "percentage" ? String(d.value / 100) : String(d.value),
            minOrderValue: d.minOrderValue ? String(d.minOrderValue) : "",
            maxDiscount: d.maxDiscount ? String(d.maxDiscount) : "",
            categoryId: d.categoryId ? String(d.categoryId) : "",
            usageLimit: d.usageLimit ? String(d.usageLimit) : "",
            startsAt: d.startsAt ? d.startsAt.split("T")[0] : "",
            expiresAt: d.expiresAt ? d.expiresAt.split("T")[0] : "",
            isActive: d.isActive,
          });
        }
        setLoading(false);
      });
  }, [discountId]);

  const updateForm = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.code.trim()) { toast.error("Discount code is required"); return; }
    if (form.type !== "free_shipping" && (!form.value || Number(form.value) <= 0)) {
      toast.error("Value is required"); return;
    }
    if (form.type === "percentage" && (Number(form.value) < 1 || Number(form.value) > 100)) {
      toast.error("Percentage must be between 1 and 100"); return;
    }
    if (form.expiresAt && form.startsAt && new Date(form.expiresAt) <= new Date(form.startsAt)) {
      toast.error("Expiry date must be after start date"); return;
    }

    setSaving(true);

    // Convert value: percentage stored as 100=1% (so 10% = 1000), fixed as cents
    const apiValue = form.type === "percentage"
      ? Number(form.value) * 100
      : Number(form.value);

    const payload = {
      code: form.code.trim(),
      description: form.description || null,
      type: form.type,
      value: apiValue,
      minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : null,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : new Date().toISOString(),
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      isActive: form.isActive,
    };

    try {
      const url = discountId ? `/api/admin/discounts/${discountId}` : "/api/admin/discounts";
      const method = discountId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();

      if (json.data) {
        toast.success(discountId ? "Discount code updated" : "Discount code created");
        router.push("/admin/discounts");
      } else {
        toast.error(json.message || "Failed to save");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-400 py-8">Loading...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Discount Code</h2>
        <div>
          <Input
            label="Code *"
            id="code"
            value={form.code}
            onChange={(e) => updateForm("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
            placeholder="e.g. SUMMER20"
            disabled={!!discountId}
          />
          {!discountId && <p className="text-xs text-gray-400 mt-0.5">Letters, numbers, no spaces. Auto-uppercase.</p>}
        </div>
        <Input label="Description (internal)" id="desc" value={form.description} onChange={(e) => updateForm("description", e.target.value)} placeholder="e.g. Summer campaign 2026" />
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Discount Type & Value</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <select value={form.type} onChange={(e) => updateForm("type", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
            <option value="percentage">Percentage (%)</option>
            <option value="fixed_amount">Fixed Amount ($)</option>
            <option value="free_shipping">Free Shipping</option>
          </select>
        </div>

        {form.type !== "free_shipping" && (
          <div>
            <Input
              label={form.type === "percentage" ? "Discount (%) *" : "Discount amount (cents) *"}
              id="value"
              value={form.value}
              onChange={(e) => updateForm("value", positiveNumber(e.target.value, form.type === "percentage" ? 100 : 9999999))}
              placeholder={form.type === "percentage" ? "e.g. 10" : "e.g. 1500"}
            />
            {form.type === "percentage" && form.value && <p className="text-xs text-gray-400 mt-0.5">{form.value}% off</p>}
            {form.type === "fixed_amount" && form.value && Number(form.value) > 0 && <p className="text-xs text-gray-400 mt-0.5">${(Number(form.value) / 100).toFixed(2)} off</p>}
          </div>
        )}

        {form.type === "percentage" && (
          <div>
            <Input
              label="Max discount (cents)"
              id="maxDiscount"
              value={form.maxDiscount}
              onChange={(e) => updateForm("maxDiscount", positiveNumber(e.target.value, 9999999))}
              placeholder="e.g. 3000"
            />
            {form.maxDiscount && Number(form.maxDiscount) > 0 && <p className="text-xs text-gray-400 mt-0.5">Max ${(Number(form.maxDiscount) / 100).toFixed(2)} discount</p>}
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Conditions</h2>
        <div>
          <Input
            label="Minimum order value (cents)"
            id="minOrder"
            value={form.minOrderValue}
            onChange={(e) => updateForm("minOrderValue", positiveNumber(e.target.value, 9999999))}
            placeholder="e.g. 5000"
          />
          {form.minOrderValue && Number(form.minOrderValue) > 0 && <p className="text-xs text-gray-400 mt-0.5">Min order: ${(Number(form.minOrderValue) / 100).toFixed(2)}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Apply to category</label>
          <select value={form.categoryId} onChange={(e) => updateForm("categoryId", e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
            <option value="">All products</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <Input
            label="Usage limit"
            id="usageLimit"
            value={form.usageLimit}
            onChange={(e) => updateForm("usageLimit", positiveNumber(e.target.value, 999999))}
            placeholder="Empty = unlimited"
          />
          {form.usageLimit && <p className="text-xs text-gray-400 mt-0.5">{form.usageLimit === "1" ? "Single use" : `Max ${form.usageLimit} uses`}</p>}
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Validity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Starts at *" id="startsAt" type="date" value={form.startsAt} onChange={(e) => updateForm("startsAt", e.target.value)} />
          <div>
            <Input label="Expires at" id="expiresAt" type="date" value={form.expiresAt} onChange={(e) => updateForm("expiresAt", e.target.value)} />
            <p className="text-xs text-gray-400 mt-0.5">Empty = never expires</p>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isActive} onChange={(e) => updateForm("isActive", e.target.checked)} className="rounded border-gray-300 text-green-700 focus:ring-green-600" />
          <span className="text-sm text-gray-700">Active</span>
        </label>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => router.push("/admin/discounts")}>Cancel</Button>
        <Button onClick={handleSubmit} loading={saving}>
          {discountId ? "Save Changes" : "Create Discount Code"}
        </Button>
      </div>
    </div>
  );
}
