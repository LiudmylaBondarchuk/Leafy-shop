"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Store, Mail, TestTube, Info, Tag, Plus, Pencil, Trash2, X } from "lucide-react";

function Tooltip({ text }: { text: string }) {
  return (
    <span className="group relative inline-block ml-1 align-middle">
      <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
      <span className="invisible group-hover:visible absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 rounded-lg bg-gray-900 text-white text-xs p-2.5 leading-snug shadow-lg">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleanupModal, setCleanupModal] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [catForm, setCatForm] = useState<{ id?: number; name: string; description: string } | null>(null);
  const [deleteCatModal, setDeleteCatModal] = useState<{ id: number; name: string } | null>(null);

  const fetchCategories = () => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((json) => setCategories(json.data || []));
  };

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        setSettings(json.data || {});
        setLoading(false);
      });
    fetchCategories();
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.data) {
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const res = await fetch("/api/cron/cleanup-test-data?token=" + (process.env.NEXT_PUBLIC_CRON_SECRET || "leafy-cron-secret-token"));
      const json = await res.json();
      if (json.data) {
        toast.success(`Cleanup complete: ${json.data.products} products, ${json.data.discounts} discounts, ${json.data.orders} orders removed`);
      } else {
        toast.error("Cleanup failed");
      }
    } catch {
      toast.error("Cleanup failed");
    } finally {
      setCleaning(false);
      setCleanupModal(false);
    }
  };

  if (loading) return <div className="text-gray-400 py-8">Loading settings...</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <Button onClick={handleSave} loading={saving}>Save Changes</Button>
      </div>

      {/* Store Info */}
      <Card className="p-5 space-y-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Store className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Store Information</h2>
          <Tooltip text="Used in invoices, order confirmation emails, and the invoice footer as seller details." />
        </div>
        <Input label="Store name" id="storeName" value={settings["store.name"] || ""} onChange={(e) => updateSetting("store.name", e.target.value)} />
        <Input label="Address" id="storeAddress" value={settings["store.address"] || ""} onChange={(e) => updateSetting("store.address", e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Phone" id="storePhone" value={settings["store.phone"] || ""} onChange={(e) => updateSetting("store.phone", e.target.value)} />
          <Input label="Contact email" id="storeEmail" value={settings["store.email"] || ""} onChange={(e) => updateSetting("store.email", e.target.value)} />
        </div>
        <p className="text-xs text-gray-400">This information appears on invoices and in email footers.</p>
      </Card>

      {/* Email Configuration */}
      <Card className="p-5 space-y-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Email Configuration</h2>
          <Tooltip text="These are the 'from' addresses used when sending emails to customers. They must be verified in Resend." />
        </div>
        <Input label="Orders email (from)" id="emailOrders" value={settings["email.orders_from"] || ""} onChange={(e) => updateSetting("email.orders_from", e.target.value)} />
        <p className="text-xs text-gray-400 -mt-2">Used for order confirmation emails.</p>
        <Input label="Invoices email (from)" id="emailInvoices" value={settings["email.invoices_from"] || ""} onChange={(e) => updateSetting("email.invoices_from", e.target.value)} />
        <p className="text-xs text-gray-400 -mt-2">Used as seller contact on invoices.</p>
        <Input label="No-reply email (from)" id="emailNoreply" value={settings["email.noreply_from"] || ""} onChange={(e) => updateSetting("email.noreply_from", e.target.value)} />
        <p className="text-xs text-gray-400 -mt-2">Used for status updates, welcome emails, and password resets.</p>
        <p className="text-xs text-gray-400">All emails must use the @leafyshop.eu domain (verified with Resend).</p>

        {/* Email overview table */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Emails sent by the system</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400">
                <th className="text-left py-1 font-medium">Email type</th>
                <th className="text-left py-1 font-medium">From address</th>
                <th className="text-left py-1 font-medium">When sent</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-t border-gray-50">
                <td className="py-1.5">Order Confirmation</td>
                <td className="py-1.5 font-mono text-[11px]">{settings["email.orders_from"] || "orders@leafyshop.eu"}</td>
                <td className="py-1.5">Customer places an order</td>
              </tr>
              <tr className="border-t border-gray-50">
                <td className="py-1.5">Status Update (paid, shipped, delivered, etc.)</td>
                <td className="py-1.5 font-mono text-[11px]">{settings["email.noreply_from"] || "noreply@leafyshop.eu"}</td>
                <td className="py-1.5">Order status changes</td>
              </tr>
              <tr className="border-t border-gray-50">
                <td className="py-1.5">Welcome (new user)</td>
                <td className="py-1.5 font-mono text-[11px]">{settings["email.noreply_from"] || "noreply@leafyshop.eu"}</td>
                <td className="py-1.5">Admin creates a new user</td>
              </tr>
              <tr className="border-t border-gray-50">
                <td className="py-1.5">Password Reset</td>
                <td className="py-1.5 font-mono text-[11px]">{settings["email.noreply_from"] || "noreply@leafyshop.eu"}</td>
                <td className="py-1.5">Admin resets user password</td>
              </tr>
              <tr className="border-t border-gray-50">
                <td className="py-1.5">Invoice (seller contact)</td>
                <td className="py-1.5 font-mono text-[11px]">{settings["email.invoices_from"] || "invoices@leafyshop.eu"}</td>
                <td className="py-1.5">Shown on invoice document</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Categories */}
      <Card className="p-5 space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Categories</h2>
            <Tooltip text="Product categories displayed on the storefront. Each product belongs to one category." />
          </div>
          <Button size="sm" onClick={() => setCatForm({ name: "", description: "" })}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {categories.length === 0 ? (
          <p className="text-sm text-gray-400">No categories yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                  {cat.description && <p className="text-xs text-gray-400">{cat.description}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setCatForm({ id: cat.id, name: cat.name, description: cat.description || "" })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteCatModal({ id: cat.id, name: cat.name })}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tester Limits */}
      <Card className="p-5 space-y-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TestTube className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Tester Configuration</h2>
          <Tooltip text="Limits for tester accounts. Test data is automatically cleaned up daily at 3:00 AM." />
        </div>
        <Input label="Session duration (minutes)" id="testerSession" type="number" value={settings["tester.session_minutes"] || "180"} onChange={(e) => updateSetting("tester.session_minutes", e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Max test products" id="testerProducts" type="number" value={settings["tester.max_products"] || "20"} onChange={(e) => updateSetting("tester.max_products", e.target.value)} />
          <Input label="Max test discounts" id="testerDiscounts" type="number" value={settings["tester.max_discounts"] || "10"} onChange={(e) => updateSetting("tester.max_discounts", e.target.value)} />
          <Input label="Max test orders" id="testerOrders" type="number" value={settings["tester.max_orders"] || "50"} onChange={(e) => updateSetting("tester.max_orders", e.target.value)} />
        </div>
        <p className="text-xs text-gray-400">Test data created by testers is automatically cleaned up daily at 3:00 AM.</p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setCleanupModal(true)}
        >
          Clean Up Test Data Now
        </Button>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>Save Changes</Button>
      </div>

      {/* Category form modal */}
      {catForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCatForm(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">{catForm.id ? "Edit Category" : "Add Category"}</h3>
              <button onClick={() => setCatForm(null)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <Input label="Name" id="catName" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
              <Input label="Description (optional)" id="catDesc" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setCatForm(null)}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={async () => {
                const method = catForm.id ? "PUT" : "POST";
                const res = await fetch("/api/admin/categories", {
                  method,
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(catForm),
                });
                const json = await res.json();
                if (json.data) {
                  toast.success(catForm.id ? "Category updated" : "Category added");
                  setCatForm(null);
                  fetchCategories();
                } else {
                  toast.error(json.message || "Failed to save category");
                }
              }}>
                {catForm.id ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete category modal */}
      {deleteCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteCatModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100"><Trash2 className="h-5 w-5 text-red-600" /></div>
              <h3 className="font-semibold text-gray-900">Delete Category</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete <strong>{deleteCatModal.name}</strong>? This will only work if no products use this category.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setDeleteCatModal(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={async () => {
                const res = await fetch(`/api/admin/categories?id=${deleteCatModal.id}`, { method: "DELETE" });
                const json = await res.json();
                if (json.data) {
                  toast.success("Category deleted");
                  setDeleteCatModal(null);
                  fetchCategories();
                } else {
                  toast.error(json.message || "Failed to delete");
                }
              }}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Cleanup confirmation modal */}
      {cleanupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCleanupModal(false)}>
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100">
                <TestTube className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Clean Up Test Data</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure? This will permanently delete all test products, discounts, and orders created by testers. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setCleanupModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={handleCleanup} loading={cleaning}>
                Clean Up
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
