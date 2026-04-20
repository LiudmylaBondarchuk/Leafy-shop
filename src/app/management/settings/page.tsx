"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Store, Mail, FlaskConical, Info, Tag, Plus, Pencil, Trash2, X, Star, FileText, Bell } from "lucide-react";
import { CardSkeleton } from "@/components/ui/Skeleton";

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

type BadgeItem = { id: string; name: string; color: string };

const BADGE_COLORS = [
  { value: "green", label: "Green" },
  { value: "amber", label: "Amber / Gold" },
  { value: "blue", label: "Blue" },
  { value: "purple", label: "Purple" },
  { value: "red", label: "Red" },
  { value: "pink", label: "Pink" },
];

const BADGE_COLOR_MAP: Record<string, string> = {
  green: "bg-green-100 text-green-800 border-green-300",
  amber: "bg-amber-100 text-amber-800 border-amber-300",
  blue: "bg-blue-100 text-blue-800 border-blue-300",
  purple: "bg-purple-100 text-purple-800 border-purple-300",
  red: "bg-red-100 text-red-800 border-red-300",
  pink: "bg-pink-100 text-pink-800 border-pink-300",
};


function BadgePreview({ name, color }: { name: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${BADGE_COLOR_MAP[color] || BADGE_COLOR_MAP.green}`}>
      {name}
    </span>
  );
}

const DEFAULT_BADGES: BadgeItem[] = [
  { id: "featured", name: "Bestseller", color: "green" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleanupModal, setCleanupModal] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [catForm, setCatForm] = useState<{ id?: number; name: string; description: string } | null>(null);
  const [deleteCatModal, setDeleteCatModal] = useState<{ id: number; name: string } | null>(null);
  const [badges, setBadges] = useState<BadgeItem[]>(DEFAULT_BADGES);
  const [badgeForm, setBadgeForm] = useState<BadgeItem | null>(null);
  const [badgeFormIsNew, setBadgeFormIsNew] = useState(false);
  const [deleteBadgeModal, setDeleteBadgeModal] = useState<BadgeItem | null>(null);
  const [userRole, setUserRole] = useState("");

  // Get current user role
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((json) => {
      if (json.data?.user) setUserRole(json.data.user.role || "");
    });
  }, []);

  const fetchCategories = () => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((json) => setCategories(json.data || []));
  };

  const parseBadges = (s: Record<string, string>): BadgeItem[] => {
    try {
      const raw = s["store.badges"];
      if (raw) return JSON.parse(raw) as BadgeItem[];
    } catch { /* ignore */ }
    // Fallback: derive from legacy badge.featured.* keys
    return [{ id: "featured", name: s["badge.featured.label"] || "Bestseller", color: s["badge.featured.color"] || "green" }];
  };

  const syncBadgesToSettings = (list: BadgeItem[], s: Record<string, string>): Record<string, string> => {
    const featured = list.find((b) => b.id === "featured");
    return {
      ...s,
      "store.badges": JSON.stringify(list),
      "badge.featured.label": featured?.name || "Bestseller",
      "badge.featured.color": featured?.color || "green",
    };
  };

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        const data = json.data || {};
        setSettings(data);
        setBadges(parseBadges(data));
        setLoading(false);
      });
    fetchCategories();
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = async () => {
    if (userRole === "tester") {
      toast.error("This action is not available in test mode");
      return;
    }
    setSaving(true);
    try {
      const merged = syncBadgesToSettings(badges, settings);
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(merged),
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
    if (userRole === "tester") {
      toast.error("This action is not available in test mode");
      setCleanupModal(false);
      return;
    }
    setCleaning(true);
    try {
      const res = await fetch("/api/admin/cleanup", { method: "POST" });
      const json = await res.json();
      if (json.data) {
        toast.success(`Cleanup complete: ${json.data.products} products, ${json.data.discounts} discounts, ${json.data.orders} orders removed`);
      } else {
        toast.error(json.error || "Cleanup failed");
      }
    } catch {
      toast.error("Cleanup failed");
    } finally {
      setCleaning(false);
      setCleanupModal(false);
    }
  };

  if (loading) return <div className="max-w-5xl py-8"><CardSkeleton /></div>;

  return (
    <div className="max-w-5xl w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <Button onClick={handleSave} loading={saving}>Save Changes</Button>
      </div>

      {/* Store Info */}
      <Card className="p-5 space-y-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Store className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Store Information</h2>
          <Tooltip text="Used in invoices, order confirmation emails, and the invoice footer as seller details." />
        </div>
        <Input label="Store name" id="storeName" value={settings["store.name"] || ""} onChange={(e) => updateSetting("store.name", e.target.value)} />
        <Input label="Address" id="storeAddress" value={settings["store.address"] || ""} onChange={(e) => updateSetting("store.address", e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Phone" id="storePhone" value={settings["store.phone"] || ""} onChange={(e) => updateSetting("store.phone", e.target.value)} />
          <Input label="Contact email" id="storeEmail" value={settings["store.email"] || ""} onChange={(e) => updateSetting("store.email", e.target.value)} />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">This information appears on invoices and in email footers.</p>
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <Input label="Default VAT rate (%)" id="storeVatRate" type="number" value={settings["store.vat_rate"] || "23"} onChange={(e) => updateSetting("store.vat_rate", e.target.value)} />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Applied to all orders. Set to 0 to disable VAT.</p>
        </div>
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-4">
          <div>
            <Input label="GTM Container ID" id="storeGtmId" value={settings["store.gtm_id"] || ""} onChange={(e) => updateSetting("store.gtm_id", e.target.value)} placeholder="GTM-XXXXXXX" />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Google Tag Manager container. Manages all tracking scripts in one place.</p>
          </div>
          <div>
            <Input label="Google Analytics 4 (GA4) Measurement ID" id="storeGa4Id" value={settings["store.ga4_id"] || ""} onChange={(e) => updateSetting("store.ga4_id", e.target.value)} placeholder="G-XXXXXXXXXX" />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Direct GA4 tracking. Leave empty if using GTM for analytics.</p>
          </div>
          <div>
            <Input label="Facebook / Meta Pixel ID" id="storeFbPixel" value={settings["store.fb_pixel_id"] || ""} onChange={(e) => updateSetting("store.fb_pixel_id", e.target.value)} placeholder="1234567890" />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tracks conversions from Facebook and Instagram ads.</p>
          </div>
        </div>
      </Card>

      {/* Email Configuration */}
      <Card className="p-5 space-y-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Email Configuration</h2>
          <Tooltip text="These are the 'from' addresses used when sending emails to customers. They must be verified in Resend." />
        </div>
        <Input label="Orders email (from)" id="emailOrders" value={settings["email.orders_from"] || ""} onChange={(e) => updateSetting("email.orders_from", e.target.value)} />
        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">Used for order confirmation emails.</p>
        <Input label="Invoices email (from)" id="emailInvoices" value={settings["email.invoices_from"] || ""} onChange={(e) => updateSetting("email.invoices_from", e.target.value)} />
        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">Used as seller contact on invoices.</p>
        <Input label="No-reply email (from)" id="emailNoreply" value={settings["email.noreply_from"] || ""} onChange={(e) => updateSetting("email.noreply_from", e.target.value)} />
        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">Used for status updates, welcome emails, and password resets.</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">All emails must use the @leafyshop.eu domain (verified with Resend).</p>
      </Card>

      {/* Categories */}
      <Card className="p-5 space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Categories</h2>
            <Tooltip text="Product categories displayed on the storefront. Each product belongs to one category." />
          </div>
          <Button size="sm" onClick={() => setCatForm({ name: "", description: "" })}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>

        {categories.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No categories yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{cat.name}</p>
                  {cat.description && <p className="text-xs text-gray-400 dark:text-gray-500">{cat.description}</p>}
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

      {/* Product Badges */}
      <Card className="p-5 space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Product Badges</h2>
            <Tooltip text="Badges displayed on product cards. The 'Featured' badge (marked with a lock) is linked to the Bestseller checkbox in the product form and cannot be deleted. Custom badges are saved for future use." />
          </div>
          <Button size="sm" onClick={() => { setBadgeFormIsNew(true); setBadgeForm({ id: "", name: "", color: "green" }); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Badge
          </Button>
        </div>

        {badges.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">No badges configured.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {badges.map((badge) => (
              <div key={badge.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <BadgePreview name={badge.name} color={badge.color} />
                  {badge.id === "featured" && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">Default — linked to Bestseller</span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => { setBadgeFormIsNew(false); setBadgeForm({ ...badge }); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {badge.id !== "featured" && (
                    <Button variant="ghost" size="sm" onClick={() => setDeleteBadgeModal(badge)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 dark:text-gray-500">Click Save Changes to persist badge updates. The Featured badge appears on products marked as Bestseller. Custom badges are stored for future product assignment.</p>
      </Card>

      {/* Email Templates */}
      <Card className="p-5 space-y-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Email Templates</h2>
          <Tooltip text="Customize the text content of emails sent to customers. Use {name} for customer name, {orderNumber} for order number, {total} for order total." />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {"Customize the message content for each email type. The header (logo, 'Leafy', 'Premium Teas & Coffees') and footer are shared across all emails."}
        </p>

        <div className="rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 p-3">
          <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Available variables</p>
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">{"{name}"}</code>{" "}
            <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">{"{orderNumber}"}</code>{" "}
            <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">{"{total}"}</code>{" "}
            <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">{"{paymentMethod}"}</code>{" "}
            <code className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">{"{shippingMethod}"}</code>
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Customer Emails — Message Body</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">Left column describes when the email is sent. Right column is the editable message text.</p>

          {[
            { key: "email.tpl.order_greeting", enableKey: "email.enabled.order_confirmation", label: "Order Confirmation", desc: "Greeting shown at the top of the order confirmation email", placeholder: "Hi {name}, thank you for your order!" },
            { key: "email.tpl.status_paid", enableKey: "email.enabled.status_paid", label: "Payment Confirmed", desc: "Sent when payment is received (PayPal)", placeholder: "Your payment has been received. We'll start preparing your order shortly." },
            { key: "email.tpl.status_processing", enableKey: "email.enabled.status_processing", label: "Order Processing", desc: "Sent when admin starts preparing the order", placeholder: "Our team is carefully packing your teas and coffees. We'll notify you once it's shipped." },
            { key: "email.tpl.status_shipped", enableKey: "email.enabled.status_shipped", label: "Order Shipped", desc: "Sent when order is dispatched to courier/locker", placeholder: "Your package is on its way! It should arrive within 2–4 business days." },
            { key: "email.tpl.status_delivered", enableKey: "email.enabled.status_delivered", label: "Order Delivered", desc: "Sent when order is marked as delivered", placeholder: "We hope you enjoy your products! If you have any questions, don't hesitate to contact us." },
            { key: "email.tpl.status_cancelled", enableKey: "email.enabled.status_cancelled", label: "Order Cancelled", desc: "Sent when order is cancelled (by admin or customer)", placeholder: "Your order has been cancelled. All reserved items have been returned to stock." },
            { key: "email.tpl.status_returned", enableKey: "email.enabled.status_returned", label: "Return Processed", desc: "Sent when a return is confirmed", placeholder: "We've received your return. Your refund will be processed within 5–10 business days." },
          ].map((tpl) => (
            <div key={tpl.key} className="grid grid-cols-1 md:grid-cols-3 gap-3 py-2 border-t border-gray-100 dark:border-gray-700 first:border-t-0">
              <div className="md:col-span-1">
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings[tpl.enableKey] !== "false"}
                      onChange={(e) => updateSetting(tpl.enableKey, e.target.checked ? "true" : "false")}
                      className="rounded border-gray-300 text-green-700 focus:ring-green-600 h-3.5 w-3.5"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{tpl.label}</span>
                  </label>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 ml-5">{tpl.desc}</p>
              </div>
              <div className="md:col-span-2">
                <textarea
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm disabled:opacity-50"
                  rows={2}
                  value={settings[tpl.key] || tpl.placeholder}
                  onChange={(e) => updateSetting(tpl.key, e.target.value)}
                  placeholder={tpl.placeholder}
                  disabled={settings[tpl.enableKey] === "false"}
                />
              </div>
            </div>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-2 border-t border-gray-100 dark:border-gray-700">
            <div className="md:col-span-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Email Footer</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Extra text shown at the bottom of every email</p>
            </div>
            <div className="md:col-span-2">
              <Input
                label=""
                id="emailFooter"
                value={settings["email.tpl.footer"] || ""}
                onChange={(e) => updateSetting("email.tpl.footer", e.target.value)}
                placeholder="e.g. Thank you for choosing Leafy!"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Stock Alerts */}
      <Card className="p-5 space-y-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Stock Alerts</h2>
          <Tooltip text="Receive email alerts when product stock falls below the configured threshold. Checked daily at 3:00 AM." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Input label="Critical threshold (instant alert)" id="alertCritical" type="number" value={settings["alerts.critical_threshold"] || "5"} onChange={(e) => updateSetting("alerts.critical_threshold", e.target.value)} />
            <p className="text-xs text-gray-400 dark:text-gray-500">Immediate email when stock drops to this level after an order.</p>
          </div>
          <div className="space-y-1">
            <Input label="Warning threshold (daily report)" id="alertWarning" type="number" value={settings["alerts.warning_threshold"] || "10"} onChange={(e) => updateSetting("alerts.warning_threshold", e.target.value)} />
            <p className="text-xs text-gray-400 dark:text-gray-500">Daily report at 3:00 AM with products at or below this level.</p>
          </div>
        </div>
        <Input label="Alert recipients" id="alertRecipients" value={settings["alerts.stock_recipients"] || ""} onChange={(e) => updateSetting("alerts.stock_recipients", e.target.value)} placeholder="admin@leafyshop.eu, warehouse@leafyshop.eu" />
        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2">Comma-separated list of email addresses.</p>
        <Input label="Alert from email" id="alertFrom" value={settings["email.alerts_from"] || "alerts@leafyshop.eu"} onChange={(e) => updateSetting("email.alerts_from", e.target.value)} />
      </Card>

      {/* Tester Limits */}
      <Card className="p-5 space-y-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Tester Configuration</h2>
          <Tooltip text="Limits for tester accounts. Test data is automatically cleaned up daily at 3:00 AM." />
        </div>
        <div className="w-full">
          <Input label="Session duration (minutes)" id="testerSession" type="number" value={settings["tester.session_minutes"] || "180"} onChange={(e) => updateSetting("tester.session_minutes", e.target.value)} className="w-full" />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">How long a tester session lasts before automatic logout. After this time, the tester must generate a new password.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Input label="Max test products" id="testerProducts" type="number" value={settings["tester.max_products"] || "20"} onChange={(e) => updateSetting("tester.max_products", e.target.value)} />
            <p className="text-xs text-gray-400 dark:text-gray-500">Maximum number of products a tester can create during their session.</p>
          </div>
          <div className="space-y-1">
            <Input label="Max test discounts" id="testerDiscounts" type="number" value={settings["tester.max_discounts"] || "10"} onChange={(e) => updateSetting("tester.max_discounts", e.target.value)} />
            <p className="text-xs text-gray-400 dark:text-gray-500">Maximum number of discount codes a tester can create.</p>
          </div>
          <div className="space-y-1">
            <Input label="Max test orders" id="testerOrders" type="number" value={settings["tester.max_orders"] || "50"} onChange={(e) => updateSetting("tester.max_orders", e.target.value)} />
            <p className="text-xs text-gray-400 dark:text-gray-500">Maximum number of test orders a tester can place.</p>
          </div>
        </div>
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings["tester.emails_enabled"] === "true"}
              onChange={(e) => updateSetting("tester.emails_enabled", e.target.checked ? "true" : "false")}
              className="rounded border-gray-300 text-green-700 focus:ring-green-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Allow tester actions to send emails to customers</span>
          </label>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-6">When disabled, status changes and other actions by testers will not trigger any customer emails. Enabled by default: off.</p>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">Test data created by testers is automatically cleaned up daily at 3:00 AM.</p>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{catForm.id ? "Edit Category" : "Add Category"}</h3>
              <button onClick={() => setCatForm(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="h-4 w-4" /></button>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30"><Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Delete Category</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
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

      {/* Badge form modal */}
      {badgeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setBadgeForm(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{badgeFormIsNew ? "Add Badge" : "Edit Badge"}</h3>
              <button onClick={() => setBadgeForm(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <Input label="Badge name" id="badgeName" value={badgeForm.name} onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })} />
              {badgeFormIsNew && (
                <Input label="Badge ID (lowercase, no spaces)" id="badgeId" value={badgeForm.id} onChange={(e) => setBadgeForm({ ...badgeForm, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })} />
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                <select
                  value={badgeForm.color}
                  onChange={(e) => setBadgeForm({ ...badgeForm, color: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
                >
                  {BADGE_COLORS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Preview:</span>
                <BadgePreview name={badgeForm.name || "Badge"} color={badgeForm.color} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setBadgeForm(null)}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={() => {
                if (!badgeForm.name.trim()) { toast.error("Badge name is required"); return; }
                if (badgeFormIsNew) {
                  const id = badgeForm.id.trim() || badgeForm.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
                  if (badges.some((b) => b.id === id)) { toast.error("A badge with this ID already exists"); return; }
                  setBadges([...badges, { id, name: badgeForm.name.trim(), color: badgeForm.color }]);
                  toast.success("Badge added — click Save Changes to persist");
                } else {
                  setBadges(badges.map((b) => b.id === badgeForm.id ? { ...b, name: badgeForm.name.trim(), color: badgeForm.color } : b));
                  toast.success("Badge updated — click Save Changes to persist");
                }
                setBadgeForm(null);
              }}>
                {badgeFormIsNew ? "Add" : "Update"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete badge modal */}
      {deleteBadgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteBadgeModal(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30"><Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Delete Badge</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to delete the <strong>{deleteBadgeModal.name}</strong> badge?
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setDeleteBadgeModal(null)}>Cancel</Button>
              <Button variant="destructive" size="sm" className="flex-1" onClick={() => {
                setBadges(badges.filter((b) => b.id !== deleteBadgeModal.id));
                setDeleteBadgeModal(null);
                toast.success("Badge removed — click Save Changes to persist");
              }}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Cleanup confirmation modal */}
      {cleanupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCleanupModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <FlaskConical className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Clean Up Test Data</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
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
