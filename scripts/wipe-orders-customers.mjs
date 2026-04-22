import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function count(table, where = "") {
  const q = where
    ? `SELECT COUNT(*)::int AS c FROM ${table} WHERE ${where}`
    : `SELECT COUNT(*)::int AS c FROM ${table}`;
  const rows = await sql.query(q);
  return rows[0].c;
}

console.log("=== BEFORE ===");
for (const t of ["orders", "order_items", "order_status_history", "credit_notes", "customers"]) {
  console.log(`${t}: ${await count(t)}`);
}
const auditBefore = await count("audit_logs", "entity_type IN ('order','customer')");
const auditTotal = await count("audit_logs");
console.log(`audit_logs (order/customer): ${auditBefore} / total: ${auditTotal}`);

console.log("\n=== TRUNCATE ===");
await sql`TRUNCATE TABLE orders, customers, order_items, order_status_history, credit_notes RESTART IDENTITY CASCADE`;
console.log("TRUNCATE ok");

await sql`DELETE FROM audit_logs WHERE entity_type IN ('order','customer')`;
console.log("DELETE audit_logs ok");

console.log("\n=== AFTER ===");
for (const t of ["orders", "order_items", "order_status_history", "credit_notes", "customers"]) {
  console.log(`${t}: ${await count(t)}`);
}
console.log(
  `audit_logs (order/customer): ${await count("audit_logs", "entity_type IN ('order','customer')")} / total: ${await count("audit_logs")}`
);

console.log("\n=== SEQUENCE CHECK (next id) ===");
for (const t of ["orders", "customers", "order_items", "order_status_history", "credit_notes"]) {
  const rows = await sql.query(`SELECT last_value, is_called FROM ${t}_id_seq`);
  console.log(`${t}_id_seq: last_value=${rows[0].last_value} is_called=${rows[0].is_called}`);
}
