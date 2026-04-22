import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

console.log("=== BEFORE ===");
const p = await sql`SELECT id, name, deleted_at FROM products WHERE id = 20`;
console.log("Assam TGFOP:", p);
const v = await sql`SELECT id, sku FROM product_variants WHERE product_id = 20`;
console.log("variants:", v);
const a = await sql`SELECT id, email, name FROM admin_users WHERE id IN (4, 6)`;
console.log("admins to delete:", a);
const al = await sql`SELECT id, user_id, user_name, action FROM audit_logs WHERE user_id IN (4, 6)`;
console.log(`audit_logs refs (to delete): ${al.length}`);

console.log("\n=== DELETE ===");
const delAudit = await sql`DELETE FROM audit_logs WHERE user_id IN (4, 6) RETURNING id`;
console.log(`audit_logs deleted: ${delAudit.length}`);

const delAdmins = await sql`DELETE FROM admin_users WHERE id IN (4, 6) RETURNING id, email`;
console.log(`admin_users deleted:`, delAdmins);

const delVariants = await sql`DELETE FROM product_variants WHERE product_id = 20 RETURNING id`;
console.log(`product_variants deleted: ${delVariants.length}`);

const delProduct = await sql`DELETE FROM products WHERE id = 20 RETURNING id, name`;
console.log(`products deleted:`, delProduct);

console.log("\n=== AFTER ===");
const p2 = await sql`SELECT id FROM products WHERE id = 20`;
console.log(`product 20 exists: ${p2.length > 0}`);
const a2 = await sql`SELECT id FROM admin_users WHERE id IN (4, 6)`;
console.log(`admins 4/6 exist: ${a2.length > 0}`);
const al2 = await sql`SELECT COUNT(*)::int AS c FROM audit_logs`;
console.log(`audit_logs total: ${al2[0].c}`);
