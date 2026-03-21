"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Settings, Store, Mail, TestTube } from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        setSettings(json.data || {});
        setLoading(false);
      });
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
        </div>
        <Input label="Store name" id="storeName" value={settings["store.name"] || ""} onChange={(e) => updateSetting("store.name", e.target.value)} />
        <Input label="Address" id="storeAddress" value={settings["store.address"] || ""} onChange={(e) => updateSetting("store.address", e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Phone" id="storePhone" value={settings["store.phone"] || ""} onChange={(e) => updateSetting("store.phone", e.target.value)} />
          <Input label="Contact email" id="storeEmail" value={settings["store.email"] || ""} onChange={(e) => updateSetting("store.email", e.target.value)} />
        </div>
      </Card>

      {/* Email Configuration */}
      <Card className="p-5 space-y-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Email Configuration</h2>
        </div>
        <Input label="Orders email (from)" id="emailOrders" value={settings["email.orders_from"] || ""} onChange={(e) => updateSetting("email.orders_from", e.target.value)} />
        <Input label="Invoices email (from)" id="emailInvoices" value={settings["email.invoices_from"] || ""} onChange={(e) => updateSetting("email.invoices_from", e.target.value)} />
        <Input label="No-reply email (from)" id="emailNoreply" value={settings["email.noreply_from"] || ""} onChange={(e) => updateSetting("email.noreply_from", e.target.value)} />
        <p className="text-xs text-gray-400">All emails must use the @leafyshop.eu domain (verified with Resend).</p>
      </Card>

      {/* Tester Limits */}
      <Card className="p-5 space-y-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <TestTube className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Tester Configuration</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Session duration (hours)" id="testerSession" type="number" value={settings["tester.session_hours"] || "3"} onChange={(e) => updateSetting("tester.session_hours", e.target.value)} />
          <Input label="Cleanup interval (minutes)" id="testerCron" type="number" value={settings["tester.cron_interval_minutes"] || "10"} onChange={(e) => updateSetting("tester.cron_interval_minutes", e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Max test products" id="testerProducts" type="number" value={settings["tester.max_products"] || "20"} onChange={(e) => updateSetting("tester.max_products", e.target.value)} />
          <Input label="Max test discounts" id="testerDiscounts" type="number" value={settings["tester.max_discounts"] || "10"} onChange={(e) => updateSetting("tester.max_discounts", e.target.value)} />
          <Input label="Max test orders" id="testerOrders" type="number" value={settings["tester.max_orders"] || "50"} onChange={(e) => updateSetting("tester.max_orders", e.target.value)} />
        </div>
        <p className="text-xs text-gray-400">Test data created by testers is automatically cleaned up at the configured interval.</p>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>Save Changes</Button>
      </div>
    </div>
  );
}
