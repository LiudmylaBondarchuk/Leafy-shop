export const ALL_PERMISSIONS = [
  { key: "products.view", label: "View products", group: "Products" },
  { key: "products.edit", label: "Add & edit products", group: "Products" },
  { key: "products.delete", label: "Delete products", group: "Products" },
  { key: "orders.view", label: "View orders", group: "Orders" },
  { key: "orders.manage", label: "Change order status", group: "Orders" },
  { key: "discounts.view", label: "View discount codes", group: "Discounts" },
  { key: "discounts.edit", label: "Add & edit discount codes", group: "Discounts" },
  { key: "discounts.delete", label: "Delete discount codes", group: "Discounts" },
  { key: "customers.view", label: "View customers", group: "Customers" },
  { key: "analytics.view", label: "View analytics", group: "Analytics" },
  { key: "users.view", label: "View users", group: "Users" },
  { key: "users.manage", label: "Manage users", group: "Users" },
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number]["key"];

export const ROLES = ["admin", "manager", "tester"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  manager: "Manager",
  tester: "Tester",
};

// Admin has all permissions implicitly
export function hasPermission(role: string, permissions: string[], permission: string): boolean {
  if (role === "admin") return true;
  return permissions.includes(permission);
}

// Get permissions grouped
export function getPermissionGroups() {
  const groups: Record<string, typeof ALL_PERMISSIONS[number][]> = {};
  for (const p of ALL_PERMISSIONS) {
    if (!groups[p.group]) groups[p.group] = [];
    groups[p.group].push(p);
  }
  return groups;
}
